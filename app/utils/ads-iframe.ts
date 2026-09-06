/**
 * Arma el documento que va dentro del `srcdoc` de un ad de formato HTML.
 *
 * Un ad HTML es un documento completo escrito por el anunciante, con su CSS y
 * su JS. No se sanea: el aislamiento lo da el iframe, no una allowlist. Un
 * banner como el de referencia repinta un campo de glifos con
 * `requestAnimationFrame`, y eso no existe sin JS.
 *
 * El iframe se monta con:
 *
 *     sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
 *
 * y **nunca** con `allow-same-origin` al lado de `allow-scripts`: esa
 * combinación sobre contenido del mismo origen le permite al frame alcanzar el
 * documento padre y quitarse el atributo `sandbox` a sí mismo, o sea anula todo.
 *
 * El sobre lo ponemos nosotros, no el anunciante. Él manda su HTML y nosotros
 * le inyectamos la CSP, el tema del host y un script que reporta alto y clicks.
 * Así no depende de que se acuerde de nada.
 */

/**
 * Lo que el ad NO puede hacer, aunque su JS corra.
 *
 * `connect-src 'none'` es la más importante: sin ella un ad puede mandar a su
 * propio servidor lo que vea del visitante. Con `default-src 'none'` de base,
 * todo lo que no se permite explícitamente queda bloqueado.
 *
 * La regla es **ni una petición a un tercero**, y eso incluye las imágenes:
 * un `img-src https:` abierto deja pasar el píxel de seguimiento, que es la
 * forma más común de medir una campaña. Por eso solo se permiten `data:` y el
 * host donde alojamos nosotros los assets.
 *
 * Es una decisión de posicionamiento, no técnica, y tiene un costo: algún
 * anunciante va a exigir su verificador y va a decir que no. A cambio, el
 * aviso es de los pocos que esta audiencia no bloquea —que es exactamente lo
 * que se le vende— y los números se los damos nosotros, contados en el
 * servidor y con su tamaño de muestra al lado.
 */
export const CSP_DEL_AD = [
  "default-src 'none'",
  // Solo assets que alojamos nosotros o que vienen embebidos en la pieza.
  // Un `https:` abierto acá dejaría pasar el pixel de seguimiento, que es
  // justo lo que este sitio promete que no ocurre.
  "img-src data: https://*.ufs.sh",
  "style-src 'unsafe-inline'",
  "font-src data:",
  "script-src 'unsafe-inline'",
  "connect-src 'none'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

/**
 * Script inyectado dentro del iframe. Habla con el host por `postMessage`.
 *
 * El `targetOrigin` va en '*' porque un iframe con sandbox sin
 * `allow-same-origin` tiene origen opaco: su origen es "null" y no hay un
 * valor útil que poner. La validación seria corre del lado del host, que
 * compara `event.source` contra el `contentWindow` de su propio iframe — eso
 * sí identifica al emisor, a diferencia del origen.
 */
export function scriptDelSobre(adId: number): string {
  return `(function(){
  var ID = ${adId};
  function avisar(tipo, extra) {
    var msg = { fuente: 'pegas-ad', id: ID, tipo: tipo };
    for (var k in extra) msg[k] = extra[k];
    parent.postMessage(msg, '*');
  }

  // Un iframe no se autoajusta de alto: si no lo reportamos, queda con el alto
  // que le reservamos y el ad sale cortado o con un hueco debajo.
  var ultimo = 0;
  function reportarAlto() {
    var alto = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (alto && alto !== ultimo) { ultimo = alto; avisar('alto', { alto: alto }); }
  }
  if (window.ResizeObserver) new ResizeObserver(reportarAlto).observe(document.documentElement);
  window.addEventListener('load', reportarAlto);
  reportarAlto();

  // Los clicks se cuentan en el servidor, no en el analytics del navegador:
  // los bloqueadores de publicidad tumban el analytics, y si se le va a cobrar
  // a un anunciante el numero tiene que aguantar una discusion. Se intercepta
  // en fase de captura para ganarle a cualquier handler del propio ad.
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document && !(el.tagName === 'A' && el.getAttribute('href'))) el = el.parentNode;
    if (!el || el === document) return;
    e.preventDefault();
    avisar('click', { href: el.href });
  }, true);

  // El host avisa cuando cambia el tema. Se hace por mensaje y no rearmando el
  // srcdoc porque rearmarlo recarga el iframe: reinicia la animacion y cuenta
  // una impresion de mas.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.fuente !== 'pegas-host') return;
    if (e.data.tema) document.documentElement.setAttribute('data-theme', e.data.tema);
  });
})();`;
}

export type Tema = 'light' | 'dark';

/** Un documento completo trae <html>; un fragmento hay que envolverlo. */
export function esDocumentoCompleto(html: string): boolean {
  return /<html[\s>]/i.test(html ?? '');
}

/**
 * Devuelve el HTML listo para el atributo `srcdoc`.
 *
 * Si el anunciante mandó un documento completo se le **inyecta** dentro en vez
 * de envolverlo: anidar un `<html>` dentro de otro es inválido y el navegador
 * lo desarma de formas impredecibles. Si mandó un fragmento, se envuelve.
 */
export function construirSrcdoc(html: string, adId: number, tema: Tema = 'light'): string {
  const cabeza = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${CSP_DEL_AD}"><style>html,body{margin:0;padding:0}</style>`;
  const script = `<script>${scriptDelSobre(adId)}<\/script>`;
  const contenido = html ?? '';

  if (!esDocumentoCompleto(contenido)) {
    return `<!doctype html><html data-theme="${tema}"><head>${cabeza}</head><body>${contenido}${script}</body></html>`;
  }

  let salida = contenido;

  // El tema tiene que ir en el <html> del propio anunciante, que es contra el
  // que estan escritos sus selectores html[data-theme='dark'].
  salida = salida.replace(/<html\b([^>]*)>/i, (_m, attrs: string) => {
    const limpio = String(attrs).replace(/\sdata-theme\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return `<html${limpio} data-theme="${tema}">`;
  });

  // La CSP va lo antes posible dentro de <head>: una <meta> de CSP solo aplica
  // a lo que viene despues de ella.
  salida = /<head\b[^>]*>/i.test(salida)
    ? salida.replace(/<head\b[^>]*>/i, m => `${m}${cabeza}`)
    : salida.replace(/<html\b[^>]*>/i, m => `${m}<head>${cabeza}</head>`);

  salida = /<\/body>/i.test(salida)
    ? salida.replace(/<\/body>/i, `${script}</body>`)
    : `${salida}${script}`;

  return salida;
}

/** Los mensajes que el host acepta desde un ad. Cualquier otra cosa se ignora. */
export interface MensajeDelAd {
  fuente: 'pegas-ad';
  id: number;
  tipo: 'alto' | 'click';
  alto?: number;
  href?: string;
}

/**
 * Valida un mensaje que llegó por `postMessage`.
 *
 * El origen no sirve para nada acá: un iframe con sandbox sin
 * `allow-same-origin` reporta origen "null", igual que cualquier otro frame
 * opaco de la página. Quien llama tiene que comparar además `event.source`
 * contra el `contentWindow` de su iframe; esto solo valida la forma.
 */
export function parsearMensajeDelAd(data: unknown): MensajeDelAd | null {
  if (typeof data !== 'object' || data === null) return null;
  const m = data as Record<string, unknown>;
  if (m.fuente !== 'pegas-ad') return null;
  if (typeof m.id !== 'number' || !Number.isInteger(m.id)) return null;

  if (m.tipo === 'alto') {
    // Un alto absurdo, por error o a proposito, empuja el listado fuera de la
    // pantalla. Se acota al mismo rango que impone el CHECK de la migracion.
    if (typeof m.alto !== 'number' || !Number.isFinite(m.alto) || m.alto < 1 || m.alto > 200) {
      return null;
    }
    return { fuente: 'pegas-ad', id: m.id, tipo: 'alto', alto: Math.ceil(m.alto) };
  }

  if (m.tipo === 'click') {
    if (typeof m.href !== 'string') return null;
    return { fuente: 'pegas-ad', id: m.id, tipo: 'click', href: m.href };
  }

  return null;
}
