/**
 * Tests del parser de emails de LinkedIn.
 *
 * Carga n8n/parser-code.js tal cual corre en n8n (es un fragmento con `return`
 * de nivel superior y `$input`, asi que se envuelve en una funcion) para que lo
 * que se prueba sea exactamente lo que esta en produccion. Antes este archivo
 * tenia su propia copia del parser, que se fue quedando atras y por eso no
 * detecto que los encabezados del email se guardaban como si fueran pegas.
 *
 * Los fixtures son sinteticos pero reproducen la estructura real de los emails
 * (encabezados, insignias, links de seccion). No llevan datos personales ni
 * tokens de tracking porque este repositorio es publico.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const aqui = dirname(fileURLToPath(import.meta.url));
const fuente = readFileSync(join(aqui, 'parser-code.js'), 'utf-8');

function parsear(cuerpos) {
  const items = cuerpos.map(text => ({ json: { text, to: 'test@devschile.cl' } }));
  const envoltura = new Function('$input', fuente);
  return envoltura({ all: () => items }).map(o => o.json);
}

const SEP = '\n---------------------------------------------------------\n';

// Bloque 0 real: tres lineas de encabezado antes del primer aviso. El aviso
// verdadero es SOFTWARE ENGINEER, no el texto "28 new jobs match...".
const conEncabezado = [
  'Your job alert for software engineer backend in Santiago',
  '28 new jobs match your preferences.',
  'Results from the new AI-powered job search',
  'SOFTWARE ENGINEER',
  'LATAM Airlines',
  'Las Condes',
  'This company is actively hiring',
  'View job: https://www.linkedin.com/comm/jobs/view/4445002661/?trackingId=xxx',
].join('\n');

// Variantes de insignia entre la ubicacion y el "View job:".
const conInsignias = [
  'Lider Tecnico React Native',
  'Accenture Chile',
  'Santiago',
  '77 school alumni',
  'View job: https://www.linkedin.com/comm/jobs/view/4437345845/?trackingId=xxx',
].join('\n');

const conInsigniaApply = [
  'Ingeniero/a de desarrollo',
  'EVA-Learning',
  'Santiago',
  'Apply with resume & profile',
  'View job: https://www.linkedin.com/comm/jobs/view/4444589934/?trackingId=xxx',
].join('\n');

// Link de seccion: aparece suelto y no debe convertirse en una pega.
const linkDeSeccion = [
  'View all jobs: https://www.linkedin.com/comm/jobs/search-results/?keywords=Software+Engineer',
  '',
  'Healthcare jobs',
  'https://www.linkedin.com/comm/jobs/search-results/?keywords=x',
  '',
  'Tech Lead',
  'AgendaPro',
  'Santiago',
  'View job: https://www.linkedin.com/comm/jobs/view/4445611892/?trackingId=xxx',
].join('\n');

const email = [conEncabezado, conInsignias, conInsigniaApply, linkDeSeccion].join(SEP);
const pegas = parsear([email]);

let fallas = 0;
function chequear(nombre, condicion, detalle = '') {
  if (condicion) {
    console.log(`  ok    ${nombre}`);
  } else {
    fallas++;
    console.log(`  FALLA ${nombre}${detalle ? ' -> ' + detalle : ''}`);
  }
}

console.log(`\nParser: ${pegas.length} pegas extraidas de 4 bloques\n`);

const porUrl = Object.fromEntries(pegas.map(p => [p.url, p]));
const u = id => `https://www.linkedin.com/jobs/view/${id}/`;

chequear('extrae una pega por bloque', pegas.length === 4, `fueron ${pegas.length}`);

const latam = porUrl[u('4445002661')];
chequear('ignora los encabezados y toma el aviso real',
  latam && latam.titulo === 'SOFTWARE ENGINEER' && latam.empleador === 'LATAM Airlines',
  latam ? `titulo="${latam.titulo}" empleador="${latam.empleador}"` : 'no se extrajo');

const accenture = porUrl[u('4437345845')];
chequear('salta la insignia "N school alumni"',
  accenture && accenture.titulo === 'Lider Tecnico React Native' && accenture.ubicacion === 'Santiago',
  accenture ? `titulo="${accenture.titulo}" ubicacion="${accenture.ubicacion}"` : 'no se extrajo');

const eva = porUrl[u('4444589934')];
chequear('salta la insignia "Apply with resume & profile"',
  eva && eva.titulo === 'Ingeniero/a de desarrollo' && eva.ubicacion === 'Santiago',
  eva ? `titulo="${eva.titulo}" ubicacion="${eva.ubicacion}"` : 'no se extrajo');

const agenda = porUrl[u('4445611892')];
chequear('ignora el link de seccion "View all jobs:"',
  agenda && agenda.titulo === 'Tech Lead' && agenda.empleador === 'AgendaPro',
  agenda ? `titulo="${agenda.titulo}" empleador="${agenda.empleador}"` : 'no se extrajo');

const basura = pegas.filter(p =>
  /new jobs match|job alert|jobs similar to|view all jobs|results from the new/i.test(p.titulo) ||
  /https?:\/\//.test(p.titulo));
chequear('no guarda encabezados ni URLs como titulo', basura.length === 0,
  basura.map(b => b.titulo.slice(0, 50)).join(' | '));

chequear('todas las URLs quedan normalizadas',
  pegas.every(p => /^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+\/$/.test(p.url)),
  pegas.map(p => p.url).filter(x => !/^https:\/\/www\.linkedin\.com\/jobs\/view\/\d+\/$/.test(x)).join(' '));

console.log(fallas === 0 ? '\nTodo ok\n' : `\n${fallas} falla(s)\n`);
process.exit(fallas === 0 ? 0 : 1);
