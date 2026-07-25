import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const DATA_FILE = resolve(DATA_DIR, 'data.json');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 10000,
});

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no configurada');
    process.exit(1);
  }

  console.log('🔌 Conectando a PostgreSQL...');
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT 
        id, url, titulo, empleador, descripcion, 
        categoria, ubicacion, fecha_publicacion, 
        fuente, fecha_creacion
      FROM pegas 
      WHERE activo = TRUE 
      ORDER BY fecha_creacion DESC
    `);

    const output = {
      total: rows.length,
      fuentes: [...new Set(rows.map(r => r.fuente))],
      categorias: [...new Set(rows.map(r => r.categoria).filter(Boolean))],
      actualizado: new Date().toISOString(),
      pegas: rows.map(r => ({
        id: r.id,
        url: r.url,
        titulo: r.titulo,
        empleador: r.empleador || 'No especificado',
        descripcion: r.descripcion || '',
        categoria: r.categoria || 'Sin categoría',
        ubicacion: r.ubicacion || 'Chile',
        fecha_publicacion: r.fecha_publicacion,
        fuente: r.fuente,
        fecha_creacion: r.fecha_creacion,
      })),
    };

    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ ${output.total} pegas exportadas a data/data.json`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
