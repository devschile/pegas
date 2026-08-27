/**
 * Reinyecta `categorizar()` desde n8n/categorizar.js en todas sus copias.
 *
 * Los nodos Code de n8n no pueden importar módulos: el código vive dentro de
 * `workflow.json` como un string. Así que la función existe cinco veces (un
 * nodo por fuente) más una sexta en `parser-code.js`, que es la que cargan
 * los tests del parser de LinkedIn.
 *
 * Mantenerlas a mano ya falló una vez: las copias se separaron y a la de
 * GetOnBoard le faltaban las reglas de "Gestión" y "Soporte", así que esa
 * fuente no podía producir ninguna de las dos categorías. Este script hace
 * que la única copia editable sea `categorizar.js`.
 *
 *   node n8n/sync-categorizar.js          # reinyecta
 *   node n8n/sync-categorizar.js --check  # falla si algo quedó desincronizado
 *
 * Se edita el texto crudo de workflow.json en vez de JSON.parse + stringify
 * a propósito: el archivo lo exporta n8n con su propio formato y un
 * round-trip reformatearía las 990 líneas, escondiendo el cambio real.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const aqui = dirname(fileURLToPath(import.meta.url));
const CHECK = process.argv.includes('--check');

const INICIO = '// ===== INICIO categorizar (bloque inyectado por sync-categorizar.js) =====';
const FIN = '// ===== FIN categorizar =====';

const { CATEGORIAS } = await import('./categorizar.js');
const canonico = readFileSync(join(aqui, 'categorizar.js'), 'utf-8');
const desde = canonico.indexOf(INICIO);
const hasta = canonico.indexOf(FIN);
if (desde === -1 || hasta === -1) {
  throw new Error('categorizar.js perdió los marcadores INICIO/FIN — no se puede sincronizar');
}
const BLOQUE = canonico.slice(desde + INICIO.length, hasta).trim();

/**
 * Dentro de la función no hay ninguna llave que cierre a comienzo de línea,
 * así que el primer "\n}" después de la firma es el fin de la función.
 * `salto` es "\n" real en un .js y la secuencia literal \n (dos caracteres)
 * dentro del string JSON de workflow.json.
 */
function reemplazarFuncion(texto, bloque, salto) {
  const re = new RegExp(`function categorizar\\(t\\) \\{[\\s\\S]*?${salto}\\}`, 'g');
  const encontrados = texto.match(re);
  if (!encontrados) return { texto, copias: 0 };
  return { texto: texto.replace(re, () => bloque), copias: encontrados.length };
}

const objetivos = [
  {
    archivo: 'parser-code.js',
    salto: '\\n',
    // El bloque va tal cual: parser-code.js es JavaScript plano.
    bloque: BLOQUE,
  },
  {
    archivo: 'workflow.json',
    salto: '\\\\n',
    // Acá el bloque viaja dentro de un string JSON: hay que escaparlo igual
    // que lo haría n8n al exportar (comillas, saltos de línea, barras).
    bloque: JSON.stringify(BLOQUE).slice(1, -1),
  },
];

let desincronizado = false;
for (const objetivo of objetivos) {
  const ruta = join(aqui, objetivo.archivo);
  const original = readFileSync(ruta, 'utf-8');
  const { texto, copias } = reemplazarFuncion(original, objetivo.bloque, objetivo.salto);

  if (copias === 0) {
    throw new Error(`${objetivo.archivo}: no se encontró ninguna copia de categorizar()`);
  }
  if (texto === original) {
    console.log(`✅ ${objetivo.archivo}: ${copias} copia(s) ya al día`);
    continue;
  }
  if (CHECK) {
    console.error(`❌ ${objetivo.archivo}: ${copias} copia(s) desincronizada(s) — correr: node n8n/sync-categorizar.js`);
    desincronizado = true;
    continue;
  }
  writeFileSync(ruta, texto);
  console.log(`📝 ${objetivo.archivo}: ${copias} copia(s) actualizada(s)`);
}

/**
 * Chequeo de categorías huérfanas: GetOnBoard y WorkingNomads mapean su
 * categoría de origen a la nuestra en un `CATEGORIA_FALLBACK` que vive en el
 * nodo y no se inyecta desde acá. Si se renombra una categoría (como
 * 'Data' → 'Data/BI') y ese mapa queda con el nombre viejo, la fuente sigue
 * escribiendo en la base una categoría que ya no existe en ningún filtro.
 */
const workflow = readFileSync(join(aqui, 'workflow.json'), 'utf-8');
const conocidas = new Set(CATEGORIAS);
const huerfanas = new Set();
for (const nodo of JSON.parse(workflow).nodes) {
  const codigo = nodo.parameters?.jsCode;
  if (!codigo || !codigo.includes('categorizar')) continue;
  const candidatas = [...codigo.matchAll(/return '([^']+)';/g)].map(m => m[1]);
  const mapa = /const CATEGORIA_FALLBACK = \{([\s\S]*?)\};/.exec(codigo);
  if (mapa) candidatas.push(...[...mapa[1].matchAll(/:\s*'([^']+)'/g)].map(m => m[1]));
  for (const categoria of candidatas) {
    if (!conocidas.has(categoria)) huerfanas.add(`${nodo.name} → ${categoria}`);
  }
}
if (huerfanas.size > 0) {
  console.error('❌ categorías fuera de la lista canónica:');
  for (const h of huerfanas) console.error('   ' + h);
  desincronizado = true;
} else {
  console.log(`✅ workflow.json: sin categorías fuera de las ${CATEGORIAS.length} canónicas`);
}

if (desincronizado) process.exit(1);
