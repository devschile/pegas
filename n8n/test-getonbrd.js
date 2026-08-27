// Prueba standalone contra la API pública v0 de GetOnBoard (sin auth).
// Valida el filtro Chile/Remoto antes de correrlo dentro de n8n.
// Ejecutar: node n8n/test-getonbrd.js
//
// `categorizar` se importa de categorizar.js en vez de tener copia propia:
// este archivo existe para ver qué categoría le tocaría a cada aviso, así que
// una copia desactualizada acá mentiría justo sobre lo que viene a comprobar.
import { categorizar } from './categorizar.js';

const CATEGORIAS = [
  'programming',
  'mobile-developer',
  'sysadmin-devops-qa',
  'data-science-analytics',
  'machine-learning-ai',
  'cybersecurity',
];

async function get(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'pegas-devschile-bot (+https://pegas.devschile.cl)' },
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

const CATEGORIA_FALLBACK = {
  'Mobile Developer': 'Mobile',
  'SysAdmin / DevOps / QA': 'DevOps',
  'Data Science / Analytics': 'Data/BI',
  'Machine Learning & AI': 'AI/ML',
  Programming: 'Full Stack',
  Cybersecurity: 'Ciberseguridad',
  'Design / UX': 'Diseño',
};

let total = 0;
let matched = 0;
const vistos = new Set();

for (const categoria of CATEGORIAS) {
  const res = await get(`https://www.getonbrd.com/api/v0/categories/${categoria}/jobs?per_page=50`);
  const jobs = res.data || [];
  total += jobs.length;

  for (const job of jobs) {
    if (vistos.has(job.id)) continue;
    vistos.add(job.id);

    const a = job.attributes || {};
    const countries = a.countries || [];
    const esChile = countries.includes('Chile');
    const esRemoto = a.remote === true || countries.includes('Remote');
    if (!esChile && !esRemoto) continue;

    matched++;
    const cat = categorizar(a.title) !== 'Otros' ? categorizar(a.title) : (CATEGORIA_FALLBACK[a.category_name] || 'Otros');
    console.log(`[${esChile ? 'Chile ' : 'Remoto'}] (${cat}) ${a.title} — ${job.links.public_url}`);
  }
}

console.log(`\nRevisadas: ${total} (${CATEGORIAS.length} categorías, 50/categoría) | Relevantes Chile/Remoto: ${matched} | Duplicados entre categorías: ${total - vistos.size}`);
