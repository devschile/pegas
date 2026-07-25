import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'pega',
  user: process.env.PGUSER || 'pega',
  password: process.env.PGPASSWORD || '',
  max: 3,
  connectionTimeoutMillis: 10000,
});

// Extraídos de emails reales (25 Julio 2026)
const pegas = [
  ["Front-end Developer (Semi Senior) - Retool","https://www.linkedin.com/jobs/view/4444663362/","FactorIT","Santiago","Frontend",null],
  ["Senior Frontend Developer (REMOTE-CHILE)","https://www.linkedin.com/jobs/view/4441850071/","EY","Santiago Metropolitan Area","Frontend","remote"],
  ["Desarrolladores Java Angular Quarkus","https://www.linkedin.com/jobs/view/4441833193/","CMG3","Providencia","Frontend",null],
  ["Desarrollador/a con experiencia en Java, Angular y Quarkus","https://www.linkedin.com/jobs/view/4445278741/","Solheiro Advogados Associados","Santiago","Frontend",null],
  ["Desarrollador Frontend","https://www.linkedin.com/jobs/view/4441064858/","Apiux Tech","Santiago","Frontend",null],
  ["Principal Agentic Engineer (Front-end)","https://www.linkedin.com/jobs/view/4375450311/","APPLY","Santiago","Frontend",null],
  ["Desarrollador Experto Front End","https://www.linkedin.com/jobs/view/4440285490/","Banco de Chile","Santiago","Frontend",null],
  ["Desarrollador web","https://www.linkedin.com/jobs/view/4438089918/","BC Global","Las Condes","Otros",null],
  ["Desarrollador Full-stack (Por proyecto)","https://www.linkedin.com/jobs/view/4441244815/","MatchFY Agencia Digital","Santiago","Full Stack",null],
  ["Full Stack Developers","https://www.linkedin.com/jobs/view/4441265357/","Deloitte","Santiago","Full Stack",null],
  ["Desarrollador Frontend iOS","https://www.linkedin.com/jobs/view/4441243730/","Sermaluc","Santiago","Frontend",null],
];

async function main() {
  const client = await pool.connect();
  let ok = 0, skip = 0;
  try {
    // Limpiar datos corruptos anteriores
    await client.query('TRUNCATE pegas RESTART IDENTITY');
    
    for (const [titulo, url, empleador, ubicacion, categoria, tags] of pegas) {
      const desc = `${titulo} en ${empleador}, ${ubicacion}`;
      try {
        const res = await client.query(
          `INSERT INTO pegas (titulo, url, empleador, ubicacion, descripcion, categoria, tags, fuente, fecha_publicacion)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'linkedin',NOW()) ON CONFLICT (url) DO NOTHING`,
          [titulo, url, empleador, ubicacion, desc, categoria, tags]
        );
        if (res.rowCount > 0) ok++; else skip++;
      } catch (e) {
        console.error('Error on:', titulo, e.message);
      }
    }
    console.log(`Inserted: ${ok}, Skipped: ${skip}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
