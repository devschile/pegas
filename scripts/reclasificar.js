/**
 * Vuelve a pasar el clasificador de n8n/categorizar.js sobre las pegas ya
 * guardadas. Los nodos de n8n solo categorizan al ingerir, así que sin esto
 * un cambio de reglas aplica únicamente a lo que entre de ahí en adelante.
 *
 *   node scripts/reclasificar.js              # simulación, no escribe nada
 *   node scripts/reclasificar.js --aplicar    # escribe (imprime el SQL de rollback antes)
 *   node scripts/reclasificar.js --aplicar --degradar-a-otros
 *
 * La base solo es alcanzable desde dentro de la red de Coolify, así que esto
 * corre en el contenedor (el Dockerfile copia categorizar.js justamente para
 * eso), no desde una máquina local.
 *
 * POR QUÉ NO DEGRADA A "Otros" POR DEFECTO
 * ----------------------------------------
 * GetOnBoard y WorkingNomads traen su propia categoría de origen y sus nodos
 * la usan como respaldo cuando el título no alcanza (`CATEGORIA_FALLBACK`).
 * Ese dato no se guarda en la tabla: solo queda el resultado. Así que hay
 * pegas bien clasificadas cuyo título, por sí solo, no matchea ninguna regla
 * — "Practicante de Telecomunicaciones" es DevOps porque GetOnBoard la
 * publicó bajo "SysAdmin / DevOps / QA", no por el título.
 *
 * Reclasificar a ciegas las mandaría a Otros y perdería información que ya no
 * se puede recuperar. Por eso, cuando el clasificador dice 'Otros' y la pega
 * ya tiene una categoría real, se deja como está. `--degradar-a-otros` saltea
 * esa protección; en el corpus de agosto 2026 eso movía 27 pegas bien
 * clasificadas a Otros, así que casi nunca es lo que se quiere.
 */
import pg from 'pg';
import { categorizar } from '../n8n/categorizar.js';

const APLICAR = process.argv.includes('--aplicar');
const DEGRADAR = process.argv.includes('--degradar-a-otros');

const pool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'pega',
  user: process.env.PGUSER || 'pega',
  password: process.env.PGPASSWORD || '',
  max: 3,
  connectionTimeoutMillis: 10000,
});

async function main() {
  if (!process.env.PGHOST) {
    console.error('PGHOST no configurada — nada que reclasificar');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    // Incluye las inactivas a propósito: una pega desactivada puede volver a
    // activarse y quedaría con la categoría vieja.
    const { rows } = await client.query('SELECT id, titulo, categoria FROM pegas ORDER BY id');
    console.log(`${rows.length} pegas leídas${APLICAR ? '' : '  (simulación: no se escribe nada)'}\n`);

    const cambios = [];
    let protegidas = 0;

    for (const fila of rows) {
      const nueva = categorizar(fila.titulo);
      if (nueva === fila.categoria) continue;
      if (nueva === 'Otros' && fila.categoria && fila.categoria !== 'Otros' && !DEGRADAR) {
        protegidas++;
        continue;
      }
      cambios.push({ id: fila.id, titulo: fila.titulo, desde: fila.categoria, hacia: nueva });
    }

    const porMovimiento = new Map();
    for (const c of cambios) {
      const clave = `${c.desde || '(sin categoría)'} → ${c.hacia}`;
      porMovimiento.set(clave, (porMovimiento.get(clave) || 0) + 1);
    }
    for (const [clave, n] of [...porMovimiento.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(4)}  ${clave}`);
    }

    console.log(`\n${cambios.length} pega(s) cambian de categoría`);
    if (protegidas > 0) {
      console.log(`${protegidas} sin tocar: el título daría 'Otros' pero ya tienen categoría (probablemente del CATEGORIA_FALLBACK de la fuente). Forzalas con --degradar-a-otros.`);
    }

    if (!APLICAR) {
      console.log('\nSimulación. Para escribir: node scripts/reclasificar.js --aplicar');
      return;
    }
    if (cambios.length === 0) return;

    // La categoría anterior de cada pega no se guarda en ningún lado, así que
    // sin esto un `--aplicar` es irreversible: revertir el código no devuelve
    // las 221 filas a donde estaban. Se imprime el UPDATE inverso ANTES de
    // escribir, para que quede en el scrollback de la terminal aunque el
    // contenedor se recicle (no hay disco persistente donde dejarlo).
    console.log('\n--- ROLLBACK: guardar esto ANTES de seguir ---');
    const valores = cambios.map(c => `(${c.id},'${c.desde.replace(/'/g, "''")}')`).join(',');
    console.log(`UPDATE pegas SET categoria = v.categoria FROM (VALUES ${valores}) AS v(id, categoria) WHERE pegas.id = v.id;`);
    console.log('--- fin ROLLBACK ---\n');

    // Una sola transacción: si algo falla a mitad, la tabla no queda con la
    // mitad de las pegas en el esquema nuevo de categorías y la otra mitad no.
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE pegas SET categoria = datos.categoria, fecha_actualizacion = NOW()
         FROM (SELECT unnest($1::int[]) AS id, unnest($2::text[]) AS categoria) AS datos
         WHERE pegas.id = datos.id`,
        [cambios.map(c => c.id), cambios.map(c => c.hacia)],
      );
      await client.query('COMMIT');
      console.log(`\n✅ ${cambios.length} pega(s) actualizadas`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
