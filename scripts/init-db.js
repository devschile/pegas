import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://pega:p3g4_d3v5ch1l3_2026%21X@mawcbxmdv77ozzp84rk2iog0:5432/pega';

const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 10000,
});

async function main() {
  console.log('🔌 Conectando a PostgreSQL...');
  const client = await pool.connect();
  
  try {
    const { rows } = await client.query('SELECT 1 AS connected');
    console.log('✅ Conectado:', rows[0]);
    
    // Ejecutar schema
    const schema = readFileSync('schema.sql', 'utf-8');
    console.log('📝 Ejecutando schema.sql...');
    await client.query(schema);
    console.log('✅ Tabla creada correctamente');
    
    // Verificar
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
