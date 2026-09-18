/**
 * Levanta la base de desarrollo: aplica dev/schema.dev.sql y carga
 * dev/fixtures.json. Idempotente -- borra y recrea las tablas en cada corrida,
 * así que da igual cuántas veces se ejecute.
 *
 * Los datos son sintéticos. Nunca cargues acá un dump de producción: esa base
 * tiene avisos reales y cuentas de personas (correo, proveedor de login,
 * reacciones), y este archivo vive en un repositorio público.
 *
 * Uso: pnpm dev:db (ver README)
 */
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'pega',
  user: process.env.PGUSER || 'pega',
  password: process.env.PGPASSWORD || 'pega',
  max: 3,
  connectionTimeoutMillis: 10_000,
});

/**
 * Guarda tosca pero suficiente: si PGHOST apunta a algo que no es local, casi
 * seguro es un error de copiar y pegar, y este script empieza con un DROP.
 */
function abortarSiNoEsLocal() {
  const host = process.env.PGHOST || 'localhost';
  const locales = ['localhost', '127.0.0.1', '::1', 'postgres', 'db'];
  if (!locales.includes(host)) {
    console.error(`✋ PGHOST es "${host}", que no parece local.`);
    console.error('   Este script hace DROP TABLE. Si de verdad quieres correrlo ahí,');
    console.error('   edítalo a mano — no se destraba con una variable de entorno.');
    process.exit(1);
  }
}

async function main() {
  abortarSiNoEsLocal();

  const client = await pool.connect();
  try {
    console.log('📐 Aplicando dev/schema.dev.sql...');
    await client.query(
      'DROP TABLE IF EXISTS relacionadas_eventos, pegas_similares, ads_eventos, ads_log, ads, empresas, pegas_estado_usuario, usuarios, pegas CASCADE',
    );
    await client.query(readFileSync(join(aqui, 'schema.dev.sql'), 'utf8'));

    const { pegas, empresas, ads, similares } = JSON.parse(readFileSync(join(aqui, 'fixtures.json'), 'utf8'));
    console.log(`🌱 Cargando ${pegas.length} pegas de ejemplo...`);

    /** id de fixtures.json → id real, para que las similares no dependan del SERIAL. */
    const idPorFixture = new Map();
    for (const p of pegas) {
      const { rows } = await client.query(
        `INSERT INTO pegas (url, titulo, empleador, descripcion, categoria, ubicacion,
                            sueldo, tags, fecha_publicacion, fuente, activo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (url) DO NOTHING
         RETURNING id`,
        [p.url, p.titulo, p.empleador, p.descripcion, p.categoria, p.ubicacion,
         p.sueldo, p.tags, p.fecha_publicacion, p.fuente, p.activo],
      );
      // El ON CONFLICT no devuelve fila: sin esto seria un TypeError sin pistas.
      if (!rows[0]) throw new Error(`dos pegas de ejemplo comparten la misma url: ${p.url}`);
      idPorFixture.set(p.id, rows[0].id);
    }

    console.log(`🏢 Cargando ${empresas.length} empresas anunciantes...`);
    /** slug → id, para que las fixtures de ads no tengan que saber ids. */
    const idPorSlug = new Map();
    for (const e of empresas) {
      const { rows } = await client.query(
        `INSERT INTO empresas (nombre, slug, sitio_url, contacto_email, activo, es_casa)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id`,
        [e.nombre, e.slug, e.sitio_url, e.contacto_email, e.activo, e.es_casa],
      );
      idPorSlug.set(e.slug, rows[0].id);
    }

    // Los ads entran por acá y no por la API a propósito: sus imágenes son
    // rutas relativas a public/dev/ para que el sitio se vea completo sin
    // pedirle nada a internet, y la API real solo acepta https.
    console.log(`📢 Cargando ${ads.length} ads de ejemplo...`);
    for (const a of ads) {
      const empresaId = idPorSlug.get(a.empresa_slug);
      if (!empresaId) throw new Error(`el ad "${a.nombre}" apunta a una empresa que no existe: ${a.empresa_slug}`);
      await client.query(
        `INSERT INTO ads (empresa_id, nombre, formato, imagen_desktop_url, imagen_movil_url,
                          alt, html, alto_desktop, alto_movil, link, activo, ubicaciones,
                          inicia_en, termina_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [empresaId, a.nombre, a.formato, a.imagen_desktop_url, a.imagen_movil_url,
         a.alt, a.html, a.alto_desktop, a.alto_movil, a.link, a.activo, a.ubicaciones,
         a.inicia_en, a.termina_en],
      );
    }

    await cargarSimilares(client, similares, idPorFixture);

    const { rows } = await client.query(
      'SELECT COUNT(*) FILTER (WHERE activo) AS activas, COUNT(*) AS total FROM pegas',
    );
    const { rows: ra } = await client.query(
      `SELECT COUNT(*) FILTER (WHERE a.activo AND e.activo) AS activos, COUNT(*) AS total
       FROM ads a JOIN empresas e ON e.id = a.empresa_id`,
    );
    console.log(`✅ Listo: ${rows[0].activas} pegas activas de ${rows[0].total}, y ${ra[0].activos} ads publicables de ${ra[0].total}.`);
    console.log('   Ahora: pnpm dev → http://localhost:3000');
  } finally {
    client.release();
    await pool.end();
  }
}

/**
 * Grafo de similitud de ejemplo, para que la página de detalle tenga qué
 * mostrar en el bloque de relacionadas.
 *
 * Se salta sin ruido si `pegas_similares` no está en el esquema. Esa tabla la
 * crea pegas-core —el cálculo no vive en este repositorio— y hasta que
 * `dev/schema.dev.sql` se regenere con ella, un `pnpm dev:db` tiene que
 * seguir dejando la base utilizable igual.
 */
async function cargarSimilares(client, similares, idPorFixture) {
  const { rows } = await client.query("SELECT to_regclass('public.pegas_similares') AS tabla");
  if (!rows[0].tabla) {
    console.log('⏭️  pegas_similares no está en el esquema todavía: no se carga el grafo de similitud.');
    return;
  }

  console.log(`🔗 Cargando ${similares.length} aristas de similitud de ejemplo...`);
  for (const s of similares) {
    const pegaId = idPorFixture.get(s.pega_id);
    const similarId = idPorFixture.get(s.similar_id);
    if (!pegaId || !similarId) throw new Error(`arista hacia una pega que no existe: ${s.pega_id} → ${s.similar_id}`);
    await client.query(
      `INSERT INTO pegas_similares (pega_id, similar_id, score, motivo)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (pega_id, similar_id) DO NOTHING`,
      [pegaId, similarId, s.score, s.motivo],
    );
  }
}

main().catch(err => {
  console.error('❌', err.message);
  console.error('   ¿Está corriendo el Postgres? → docker compose -f docker-compose.dev.yml up -d');
  process.exit(1);
});
