import pg from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const outputPath = process.argv[2] || '/usr/share/nginx/html/data/data.json';
const dataDir = dirname(outputPath);

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
    console.error('PGHOST no configurada - saltando generacion de data.json');
    process.exit(0); // Non-fatal for local dev
  }

  console.log('Conectando a PostgreSQL...');
  const client = await pool.connect();

  try {
    const { rows } = await client.query(`
      SELECT 
        id, url, titulo, empleador, descripcion, 
        categoria, ubicacion, sueldo, tags, fecha_publicacion, 
        fuente, fecha_creacion
      FROM pegas
      WHERE activo = TRUE
      -- No solo la fecha de publicacion: fuentes como WorkingNomads traen
      -- pub_date real de cuando la oferta se publico originalmente (puede
      -- ser de semanas atras), y con COALESCE solo esa fecha una pega recien
      -- ingerida hoy quedaba enterrada al fondo del listado. GREATEST usa la
      -- fecha de publicacion cuando es la mas reciente (caso normal de
      -- LinkedIn/GetOnBoard, donde ambas fechas casi coinciden) pero cae a la
      -- fecha de ingesta cuando esta es mas nueva (fuentes con historial).
      ORDER BY GREATEST(COALESCE(fecha_publicacion, fecha_creacion), fecha_creacion) DESC
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
        categoria: r.categoria || 'Sin categoria',
        ubicacion: r.ubicacion || 'Chile',
        sueldo: r.sueldo || null,
        tags: r.tags || null,
        fecha_publicacion: r.fecha_publicacion,
        fuente: r.fuente,
        fecha_creacion: r.fecha_creacion,
      })),
    };

    mkdirSync(dataDir, { recursive: true });
    writeFileSync(outputPath, JSON.stringify(output));
    console.log(output.total + ' pegas exportadas a ' + outputPath);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
