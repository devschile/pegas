/**
 * Tests del digest de Slack (nodos "Agrupar notificación" y "Armar hilo de
 * detalle").
 *
 * Ejecutar: node n8n/test-digest.js
 *           node n8n/test-digest.js --ver   # imprime los mensajes de ejemplo
 *
 * El código no se copia acá: se lee el jsCode real desde n8n/workflow.json y
 * se ejecuta con un $input falso. Es la misma lección que dejó categorizar()
 * -- toda copia a mano de un nodo Code termina desincronizada -- pero
 * resuelta al revés: en vez de reinyectar la copia, acá no hay copia y el
 * test siempre corre contra lo que se va a pegar en n8n.
 *
 * Buena parte de los casos son de escape: los títulos y empleadores vienen de
 * LinkedIn y GetOnBoard, o sea de fuera, y desde este cambio se publican en
 * #trabajos como mrkdwn. Un título con `<url|texto>` adentro tiene que salir
 * como texto y nunca como link.
 *
 * El resto fija el destino de los links: todos van a pegas.devschile.cl y
 * ninguno al aviso original -- el digest existe para llevar tráfico al sitio.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const aqui = dirname(fileURLToPath(import.meta.url));
const workflow = JSON.parse(readFileSync(join(aqui, 'workflow.json'), 'utf-8'));

function nodo(nombre) {
  const encontrado = workflow.nodes.find(n => n.name === nombre);
  if (!encontrado) throw new Error(`no existe el nodo "${nombre}" en workflow.json`);
  return encontrado.parameters.jsCode;
}

/** Simula el runner de n8n: "Run Once for All Items", $input.all() y $(). */
function correr(nombre, items, nodosPrevios = {}) {
  const $input = {
    all: () => items,
    first: () => items[0],
  };
  const $ = otro => {
    if (!(otro in nodosPrevios)) throw new Error(`el nodo pidió $('${otro}') y no está en el mock`);
    return { first: () => ({ json: nodosPrevios[otro] }) };
  };
  return new Function('$input', '$', nodo(nombre)) ($input, $);
}

const agrupar = (pegas, extra = {}) =>
  correr('Agrupar notificación', pegas.map(json => ({ json: { ...base(json.id), ...json } })), extra);

let n = 0;
const base = id => ({
  id,
  titulo: `Pega ${id}`,
  empleador: 'Empresa',
  ubicacion: 'Santiago',
  categoria: 'Backend',
  sueldo: null,
  fuente: 'linkedin',
  url: `https://ejemplo.cl/${id}`,
  fecha_creacion: '2026-08-27T22:00:00.000Z',
});
const pega = campos => ({ ...base(++n), ...campos });

let fallas = 0;
function chequear(descripcion, condicion) {
  if (!condicion) fallas++;
  console.log(`  ${condicion ? 'ok  ' : 'FALLA'}  ${descripcion}`);
}

// ---------------------------------------------------------------------------

console.log('\n— Sin pegas —');
// El nodo Postgres emite un item falso {success:true} cuando el SELECT no
// devuelve filas; el digest no puede confundirlo con una pega.
chequear('un item {success:true} no dispara aviso',
  correr('Agrupar notificación', [{ json: { success: true } }]).length === 0);
chequear('cero items no dispara aviso',
  correr('Agrupar notificación', []).length === 0);

console.log('\n— Una sola pega —');
const [uno] = agrupar([pega({ titulo: 'Backend Engineer', categoria: 'Backend' })]);
chequear('habla en singular', /\b1\* pega nueva/.test(uno.json.text));
chequear('sin barras con una sola categoría', !uno.json.text.includes('█'));
chequear('el hilo trae la pega', uno.json.hilo.join('\n').includes('Backend Engineer'));
chequear('count e ids coherentes', uno.json.count === 1 && uno.json.ids.length === 1);

console.log('\n— Lote variado —');
const lote = [
  pega({ titulo: 'Salesforce Front-End Developer', categoria: 'Frontend', empleador: 'atmira' }),
  pega({ titulo: 'React Developer Senior', categoria: 'Frontend', ubicacion: 'Remote' }),
  pega({ titulo: 'Desarrollador Frontend Vue', categoria: 'Frontend' }),
  pega({ titulo: 'Full Stack Engineer', categoria: 'Full Stack', ubicacion: 'Remoto' }),
  pega({ titulo: 'Full Stack .NET', categoria: 'Full Stack' }),
  pega({ titulo: 'Desarrollador Backend Semi Senior', categoria: 'Backend' }),
  pega({ titulo: 'Ingeniero de Infraestructura', categoria: 'DevOps', empleador: 'No especificado',
         ubicacion: 'Chile', sueldo: 'USD 1500 - 2000 /mes' }),
  pega({ titulo: 'Machine Learning Engineer', categoria: 'AI/ML',
         ubicacion: 'Santiago Metropolitan Region, Chile' }),
];
const [{ json: r }] = agrupar(lote);
const hilo = r.hilo.join('\n\n');

chequear('plural y total correcto', /\*8\* pegas nuevas/.test(r.text));
chequear('la tabla ordena por cantidad', r.text.indexOf('Frontend') < r.text.indexOf('AI/ML'));
chequear('cuenta las remotas', r.text.includes('🌎 2 remotas'));
chequear('cuenta las que traen sueldo', r.text.includes('💰 1 con sueldo'));
chequear('el canal no lista pegas', !r.text.includes('Salesforce'));
chequear('el hilo agrupa por categoría', hilo.includes('|Frontend>*') && hilo.includes('|AI/ML>*'));
chequear('el hilo lista las 8 pegas', lote.every(p => hilo.includes(p.titulo)));
chequear('el título linkea a la pega en el sitio',
  hilo.includes(`<https://pegas.devschile.cl/pega/${lote[0].id}-salesforce-front-end-developer-atmira?`));
chequear('ningún link va al aviso original',
  !hilo.includes('ejemplo.cl') && !hilo.includes('linkedin.com') && !hilo.includes('getonbrd.com'));
chequear('los links traen utm para medirlos en PostHog',
  hilo.includes('utm_source=slack&utm_medium=digest&utm_content=pega'));
chequear('la categoría linkea al listado filtrado',
  hilo.includes('<https://pegas.devschile.cl/categoria/full-stack?'));
chequear('el cierre del canal linkea al sitio',
  /<https:\/\/pegas\.devschile\.cl\?[^|]*\|pegas\.devschile\.cl>/.test(r.text));
chequear('omite el empleador "No especificado"', !hilo.includes('No especificado'));
chequear('normaliza Remote y Remoto a uno solo', !/— Remote\b/.test(hilo) && hilo.includes('— Remoto'));
chequear('colapsa la ubicación larga de LinkedIn', !hilo.includes('Metropolitan') && hilo.includes('— Santiago'));
chequear('muestra el sueldo cuando existe', hilo.includes('💰 USD 1500 - 2000 /mes'));
chequear('ids en el mismo orden que entraron',
  r.ids.join(',') === lote.map(p => p.id).join(','));

console.log('\n— Escape de texto de terceros —');
const [{ json: hostil }] = agrupar([
  pega({ titulo: '<https://phishing.cl|Postula aquí ahora>', categoria: 'Backend' }),
  pega({ titulo: 'Dev & Ops', empleador: 'A & B <b>', categoria: 'DevOps' }),
  pega({ titulo: 'Url basura', categoria: 'QA', url: 'javascript:alert(1)' }),
  pega({ titulo: 'Título con | pipe y > cierre', categoria: 'Mobile' }),
  pega({ titulo: 'Sueldo raro', categoria: 'Data/BI', sueldo: '<https://evil.cl|$$$>' }),
  pega({ titulo: 'Sin id', categoria: 'Soporte', id: null }),
]);
const texto = hostil.hilo.join('\n\n');
chequear('el título con sintaxis de link sale escapado',
  texto.includes('&lt;https://phishing.cl|Postula aquí ahora&gt;'));
chequear('no se cuela un link a phishing.cl', !texto.includes('<https://phishing.cl|'));
chequear('escapa & antes que < y >', texto.includes('Dev &amp; Ops') && texto.includes('A &amp; B &lt;b&gt;'));
// La url de la fuente ya no se publica, así que una url hostil no llega a
// ningún lado -- pero el link propio igual se arma y la pega igual se lista.
chequear('la url de la fuente ya no se usa como destino', !texto.includes('javascript:'));
chequear('el título hostil no rompe el slug del destino',
  /\/pega\/\d+-titulo-con-pipe-y-cierre-empresa\?/.test(texto));
chequear('todos los destinos son del sitio',
  [...texto.matchAll(/<(\S+?)\|/g)].every(m => m[1].startsWith('https://pegas.devschile.cl/')));
chequear('el sueldo también se escapa', texto.includes('💰 &lt;https://evil.cl|$$$&gt;'));
chequear('sin id se lista sin link en vez de desaparecer',
  texto.includes('• Sin id') && !/\/pega\/(null|NaN|undefined)/.test(texto));
chequear('ninguna pega se pierde', hostil.count === 6);

console.log('\n— Slugs de categoría —');
// Los 13 slugs están verificados contra pegas.devschile.cl/categoria/*: los 13
// responden 200. Si alguien renombra una categoría en categorizar.js sin mirar
// acá, el digest empieza a linkear a un 404.
const SLUGS = {
  Frontend: 'frontend', Backend: 'backend', 'Full Stack': 'full-stack', DevOps: 'devops',
  QA: 'qa', 'AI/ML': 'ai-ml', 'Data/BI': 'data-bi', Mobile: 'mobile',
  Ciberseguridad: 'ciberseguridad', 'Diseño': 'diseno', Liderazgo: 'liderazgo',
  Soporte: 'soporte', Otros: 'otros',
};
const [{ json: cats }] = agrupar(Object.keys(SLUGS).map(categoria => pega({ categoria })));
for (const [categoria, slug] of Object.entries(SLUGS)) {
  chequear(`${categoria} → /categoria/${slug}`,
    cats.hilo.join('\n').includes(`<https://pegas.devschile.cl/categoria/${slug}?`));
}
const { CATEGORIAS } = await import('./categorizar.js');
chequear('la tabla cubre las categorías que produce categorizar()',
  CATEGORIAS.every(c => c in SLUGS));

console.log('\n— Lote grande (el backlog de 109 del 27/8) —');
const CATS = ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'QA', 'AI/ML', 'Data/BI', 'Mobile',
  'Ciberseguridad', 'Diseño', 'Liderazgo', 'Soporte', 'Otros'];
const grande = Array.from({ length: 120 }, (_, i) => pega({
  titulo: `Ingeniero de Software Senior con un título largo número ${i}`,
  empleador: `Una Empresa Con Nombre Largo ${i}`,
  categoria: CATS[i % CATS.length],
}));
const [{ json: g }] = agrupar(grande);
chequear('el detalle se parte en varios mensajes', g.hilo.length > 1);
chequear('ningún bloque pasa el límite de Slack', g.hilo.every(b => b.length <= 3800));
chequear('no se pierde ninguna pega al partir', g.hilo.join('\n').split('\n• ').length - 1 === 120);
chequear('el mensaje del canal se mantiene corto', g.text.length < 1000);
chequear('trunca los títulos largos', g.hilo.join('\n').includes('…'));

console.log('\n— Armar hilo de detalle —');
const conTs = correr('Armar hilo de detalle', [{ json: { ts: '1756339200.123456' } }],
  { 'Agrupar notificación': { hilo: ['bloque a', 'bloque b'] } });
chequear('un item por bloque, todos al mismo hilo',
  conTs.length === 2 && conTs.every(i => i.json.thread_ts === '1756339200.123456'));
chequear('toma el ts anidado en message',
  correr('Armar hilo de detalle', [{ json: { message: { ts: '1.2' } } }],
    { 'Agrupar notificación': { hilo: ['x'] } })[0].json.thread_ts === '1.2');
chequear('sin ts no publica nada suelto en el canal',
  correr('Armar hilo de detalle', [{ json: { ok: false } }],
    { 'Agrupar notificación': { hilo: ['x'] } }).length === 0);
chequear('sin bloques no publica nada',
  correr('Armar hilo de detalle', [{ json: { ts: '1.2' } }],
    { 'Agrupar notificación': {} }).length === 0);

console.log('\n— Cableado en workflow.json —');
const conexion = (desde, hasta) =>
  (workflow.connections[desde]?.main?.[0] || []).some(c => c.node === hasta);
chequear('Notificar en #trabajos → Armar hilo de detalle',
  conexion('Notificar en #trabajos', 'Armar hilo de detalle'));
chequear('Armar hilo de detalle → Detalle en el hilo',
  conexion('Armar hilo de detalle', 'Detalle en el hilo'));
const slackHilo = workflow.nodes.find(n => n.name === 'Detalle en el hilo');
chequear('el nodo del hilo responde en el thread',
  slackHilo?.parameters?.otherOptions?.thread_ts === '={{ $json.thread_ts }}');
chequear('el hilo no despliega previews de los links',
  slackHilo?.parameters?.otherOptions?.unfurl_links === false
  && slackHilo?.parameters?.otherOptions?.unfurl_media === false);

if (process.argv.includes('--ver')) {
  console.log('\n' + '='.repeat(60));
  console.log('MENSAJE DEL CANAL\n' + '='.repeat(60));
  console.log(r.text);
  console.log('\n' + '='.repeat(60));
  console.log('RESPUESTA EN EL HILO\n' + '='.repeat(60));
  console.log(r.hilo.join('\n\n--- (mensaje siguiente) ---\n\n'));
}

console.log(fallas === 0 ? '\nTodo ok\n' : `\n${fallas} falla(s)\n`);
process.exit(fallas === 0 ? 0 : 1);
