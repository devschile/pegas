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
    await client.query('DROP TABLE IF EXISTS ads, pegas_estado_usuario, usuarios, pegas CASCADE');
    await client.query(readFileSync(join(aqui, 'schema.dev.sql'), 'utf8'));

    const { pegas, ads } = JSON.parse(readFileSync(join(aqui, 'fixtures.json'), 'utf8'));
    console.log(`🌱 Cargando ${pegas.length} pegas de ejemplo...`);

    for (const p of pegas) {
      await client.query(
        `INSERT INTO pegas (url, titulo, empleador, descripcion, categoria, ubicacion,
                            sueldo, tags, fecha_publicacion, fuente, activo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (url) DO NOTHING`,
        [p.url, p.titulo, p.empleador, p.descripcion, p.categoria, p.ubicacion,
         p.sueldo, p.tags, p.fecha_publicacion, p.fuente, p.activo],
      );
    }

    // Los ads entran por acá y no por la API a propósito: sus imagen_url son
    // rutas relativas a public/dev/ para que el listado se vea completo sin
    // pedirle nada a internet, y la API real solo acepta https.
    console.log(`📢 Cargando ${ads.length} ads de ejemplo...`);
    for (const a of ads) {
      await client.query(
        `INSERT INTO ads (nombre, tipo, imagen_url, alt, html, link, activo, ubicaciones)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [a.nombre, a.tipo, a.imagen_url, a.alt, a.html, a.link, a.activo, a.ubicaciones],
      );
    }

    const { rows } = await client.query(
      'SELECT COUNT(*) FILTER (WHERE activo) AS activas, COUNT(*) AS total FROM pegas',
    );
    const { rows: ra } = await client.query(
      'SELECT COUNT(*) FILTER (WHERE activo) AS activos, COUNT(*) AS total FROM ads',
    );
    console.log(`✅ Listo: ${rows[0].activas} pegas activas de ${rows[0].total}, y ${ra[0].activos} ads activos de ${ra[0].total}.`);
    console.log('   Ahora: pnpm dev → http://localhost:3000');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌', err.message);
  console.error('   ¿Está corriendo el Postgres? → docker compose -f docker-compose.dev.yml up -d');
  process.exit(1);
});
