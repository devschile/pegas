// Prueba standalone contra la API pública v0 de GetOnBoard (sin auth).
// Valida el filtro Chile/Remoto antes de correrlo dentro de n8n.
// Ejecutar: node n8n/test-getonbrd.js

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

function categorizar(t) {
  t = t.toLowerCase();
  if (/\bfront.?end\b|frontend|\breact\b|\bvue\b|\bangular\b|\bui.ux\b|\bcss\b|\bhtml\b|\btypescript\b|\bjavascript\b|\bjs\b/i.test(t)) return 'Frontend';
  if (/\bback.?end\b|backend|\bnode\b|\bpython\b|\bdjango\b|\bflask\b|\bgo\b|\bgolang\b|\brust\b|\bjava\b|\bspring\b|\bquarkus\b|\.net\b|\bc#\b|\bphp\b|\blaravel\b|\brails\b|\bruby\b/i.test(t)) return 'Backend';
  if (/\bfull.?stack\b|fullstack/i.test(t)) return 'Full Stack';
  if (/\bdevops\b|\bsre\b|\binfra\b|\bcloud\b|\baws\b|\bazure\b|\bgcp\b|\bkubernetes\b|\bdocker\b|\bterraform\b/i.test(t)) return 'DevOps';
  if (/\bqa\b|\btester\b|\btesting\b|\bcalidad\b|\bquality\b/i.test(t)) return 'QA';
  if (/\bdata\b|\banalytics\b|\banalist[ao]s?\b|\banalyst\b|\bmachine.?learning\b|\bml\b|\bai\b|\binteligencia\b|\bartificial\b|\betl\b|\bpower.bi\b|\btableau\b|\blooker\b/i.test(t)) return 'Data';
  if (/\bmobile\b|\bandroid\b|\bios\b|\bswift\b|\bkotlin\b|\bflutter\b|\breact.native\b/i.test(t)) return 'Mobile';
  if (/\bsecurity\b|\bseguridad\b|\bciberseguridad\b|\bpentest\b/i.test(t)) return 'Ciberseguridad';
  return 'Otros';
}

const CATEGORIA_FALLBACK = {
  'Mobile Developer': 'Mobile',
  'SysAdmin / DevOps / QA': 'DevOps',
  'Data Science / Analytics': 'Data',
  'Machine Learning & AI': 'Data',
  Cybersecurity: 'Ciberseguridad',
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
