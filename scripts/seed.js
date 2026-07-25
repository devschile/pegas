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

const pegas = [
  ["Front-end Developer (Semi Senior) - Retool","https://www.linkedin.com/jobs/view/4368887043/","FactorIT","Santiago","Frontend"],
  ["Senior Frontend Developer (REMOTE-CHILE)","https://www.linkedin.com/jobs/view/4366112913/","EY","Santiago Metropolitan Area","Frontend"],
  ["Desarrolladores Java Angular Quarkus","https://www.linkedin.com/jobs/view/4365792244/","CMG3","Providencia","Frontend"],
  ["Desarrollador/a con experiencia en Java, Angular y Quarkus","https://www.linkedin.com/jobs/view/4368887044/","Solheiro Advogados Associados","Santiago","Frontend"],
  ["Desarrollador Frontend","https://www.linkedin.com/jobs/view/4368875731/","Apiux Tech","Santiago","Frontend"],
  ["Principal Agentic Engineer (Front-end)","https://www.linkedin.com/jobs/view/4368875732/","APPLY","Santiago","Frontend"],
  ["Desarrollador Experto Front End","https://www.linkedin.com/jobs/view/4368785800/","Banco de Chile","Santiago","Frontend"],
  ["Desarrollador web","https://www.linkedin.com/jobs/view/4366544174/","BC Global","Las Condes","Otros"],
  ["Desarrollador Full-stack (Por proyecto)","https://www.linkedin.com/jobs/view/4366147799/","MatchFY Agencia Digital","Santiago","Full Stack"],
  ["Full Stack Developers","https://www.linkedin.com/jobs/view/4368875733/","Deloitte","Santiago","Full Stack"],
  ["Desarrollador Frontend iOS","https://www.linkedin.com/jobs/view/4368875734/","Sermaluc","Santiago","Frontend"],
];

async function main() {
  const client = await pool.connect();
  let ok = 0, skip = 0;
  try {
    for (const [titulo, url, empleador, ubicacion, categoria] of pegas) {
      const desc = `${titulo} en ${empleador}, ${ubicacion}`;
      try {
        const res = await client.query(
          `INSERT INTO pegas (titulo, url, empleador, ubicacion, descripcion, categoria, fuente, fecha_publicacion)
           VALUES ($1,$2,$3,$4,$5,$6,'linkedin',NOW()) ON CONFLICT (url) DO NOTHING`,
          [titulo, url, empleador, ubicacion, desc, categoria]
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
