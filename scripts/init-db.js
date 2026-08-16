import pg from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || 'mawcbxmdv77ozzp84rk2iog0',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'pega',
  user: process.env.PGUSER || 'pega',
  password: process.env.PGPASSWORD || '',
  connectionTimeoutMillis: 10000,
});

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || join(process.cwd(), 'migrations');

/**
 * pg_advisory_lock(4711) evita que dos contenedores arrancando en paralelo
 * (un redeploy de Coolify solapado con el anterior) corran la misma
 * migración dos veces a la vez. El número es arbitrario, solo tiene que ser
 * el mismo en el lock y el unlock.
 */
const ADVISORY_LOCK_KEY = 4711;

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter(name => name.endsWith('.sql'))
    .sort();
}

async function runMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      aplicada_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const { rows: applied } = await client.query('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.map(row => row.version));

  const pending = listMigrationFiles().filter(file => !appliedVersions.has(file));
  if (pending.length === 0) {
    console.log('✅ No hay migraciones pendientes');
    return;
  }

  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`📝 Aplicando ${file}...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✅ ${file} aplicada`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migración ${file} falló: ${err.message}`);
    }
  }
}

async function main() {
  console.log('🔌 Conectando a PostgreSQL...');
  const client = await pool.connect();

  try {
    const { rows } = await client.query('SELECT 1 AS connected');
    console.log('✅ Conectado:', rows[0]);

    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);
    try {
      await runMigrations(client);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    }

    const { rows: tables } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pegas'
    `);
    console.log('📋 Tablas:', tables.map(t => t.table_name));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
