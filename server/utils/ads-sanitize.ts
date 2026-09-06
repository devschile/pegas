import sanitizeHtml from 'sanitize-html';

/**
 * Saneo del contenido de un banner. Un ad es HTML que pega una persona y que
 * se le renderiza a todos los visitantes, con o sin sesión: sin esto, un
 * `v-html` directo permite robar la cookie de sesión de cualquiera que pase
 * por el sitio, incluida la de otro admin.
 *
 * Se aplica DOS veces a propósito, al guardar y al renderizar. Al guardar,
 * para que la base nunca contenga algo peligroso. Al renderizar, porque una
 * fila puede haber entrado por otro camino (una migración, un arreglo a mano
 * en la base, un endpoint futuro que se olvide de sanear) y el render es el
 * único punto por el que pasa todo sí o sí.
 */

/**
 * Allowlist, no denylist. Una lista de lo prohibido siempre va un paso atrás
 * del atacante; una de lo permitido falla cerrada ante lo que no previmos.
 */
export const TAGS_PERMITIDOS = ['p', 'br', 'strong', 'b', 'em', 'i', 'span', 'div', 'a', 'img'];

const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: TAGS_PERMITIDOS,

  allowedAttributes: {
    // target y rel tienen que estar acá aunque los ponga transformTags: el
    // filtro de atributos corre DESPUES de la transformación, así que sin
    // esto el rel="noopener noreferrer" que se fuerza abajo se perdía.
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    '*': ['class'],
  },

  // Mata javascript:, data:, vbscript: y file: en cualquier href o src.
  allowedSchemes: ['http', 'https'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],

  // "//evil.cl" hereda el esquema de la página. No es un agujero por sí solo,
  // pero se salta la intención de permitir solo http/https explícitos.
  allowProtocolRelative: false,

  // Sin esto el CONTENIDO de <script> sobrevive como texto plano suelto: el
  // tag se va y queda "alert(1)" impreso en medio del banner.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'title'],

  disallowedTagsMode: 'discard',

  transformTags: {
    /**
     * Los anchors salientes van siempre con noopener/noreferrer: sin
     * `noopener`, la pestaña que se abre puede reescribir la nuestra por
     * `window.opener`. Se fuerza acá y no se confía en que venga en el HTML.
     */
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
  },
};

export function sanitizarHtml(entrada: string): string {
  return sanitizeHtml(entrada ?? '', OPCIONES);
}

/**
 * Advisory, no es la protección: sirve para que el panel pueda avisar "se
 * quitó un <script>" en vez de guardar en silencio algo distinto a lo que la
 * persona pegó. La protección real es `sanitizarHtml`, que no depende de esto.
 */
export function tagsNoPermitidos(entrada: string): string[] {
  const encontrados = [...(entrada ?? '').matchAll(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g)].map(m =>
    m[1].toLowerCase(),
  );
  return [...new Set(encontrados.filter(t => !TAGS_PERMITIDOS.includes(t)))].sort();
}

/**
 * `javascript:` y `data:` en un href son ejecución de código, así que el link
 * se valida por protocolo y no por "parece una URL". Devuelve null en vez de
 * lanzar: quien llama decide si es un 400 o si simplemente lo omite.
 */
export function validarLink(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;

  const limpio = raw.trim();
  if (limpio === '') return null;

  // Un salto de línea o un byte nulo en medio de un href sirve para partir
  // filtros ingenuos ("java\nscript:"). Acá el filtro es el protocolo, pero
  // igual se rechaza: una URL legítima no trae caracteres de control.
  if (/[\u0000-\u001f\u007f]/.test(limpio)) return null;

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return url.toString();
}
