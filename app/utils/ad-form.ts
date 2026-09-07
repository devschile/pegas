/**
 * Los pasos del alta de un ad y qué le falta a cada uno.
 *
 * Vive fuera del componente porque es la parte que decide si se puede
 * avanzar, y eso conviene poder probarlo sin montar nada. El formulario
 * entero en una pantalla obligaba a mandar al servidor para enterarse de que
 * faltaba el nombre; acá cada paso dice qué le falta antes de dejar seguir.
 */

export interface FormularioAd {
  empresa_id: number | null;
  nombre: string;
  formato: 'imagen' | 'html';
  imagen_desktop_url: string;
  imagen_movil_url: string;
  alt: string;
  html: string;
  alto_desktop: string;
  alto_movil: string;
  link: string;
  activo: boolean;
  ubicaciones: string[];
}

export type PasoId = 'anunciante' | 'pieza' | 'donde' | 'revision';

export interface Paso {
  id: PasoId;
  titulo: string;
  ayuda: string;
}

export const PASOS: Paso[] = [
  { id: 'anunciante', titulo: 'Anunciante', ayuda: 'De quién es el espacio y cómo lo vas a reconocer después.' },
  { id: 'pieza', titulo: 'La pieza', ayuda: 'Lo que va a ver quien entre al sitio.' },
  { id: 'donde', titulo: 'Dónde va', ayuda: 'En qué lugares del sitio aparece y a dónde lleva.' },
  { id: 'revision', titulo: 'Revisar', ayuda: 'Cómo se ve antes de publicarlo.' },
];

/** Alto permitido, el mismo que el CHECK de la migración. */
export const ALTO_MIN = 1;
export const ALTO_MAX = 200;

const esHttps = (u: string) => /^https:\/\//i.test(u.trim());
const esHttp = (u: string) => /^https?:\/\//i.test(u.trim());

function altoInvalido(valor: string, cual: string): string | null {
  const v = valor.trim();
  if (v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < ALTO_MIN || n > ALTO_MAX) {
    return `El alto ${cual} tiene que ser un número entero entre ${ALTO_MIN} y ${ALTO_MAX}.`;
  }
  return null;
}

/**
 * Qué le falta a un paso. Lista vacía = se puede avanzar.
 *
 * Las reglas son las mismas que aplica el servidor, escritas acá para que se
 * vean antes de enviar. El servidor sigue siendo el que manda: esto no lo
 * reemplaza, le ahorra el viaje a quien está llenando el formulario.
 */
export function problemasDelPaso(paso: PasoId, f: FormularioAd): string[] {
  const faltan: string[] = [];

  if (paso === 'anunciante') {
    if (f.empresa_id == null) faltan.push('Elige la empresa anunciante.');
    if (!f.nombre.trim()) faltan.push('Ponle un nombre interno, para reconocerlo en la lista.');
  }

  if (paso === 'pieza') {
    if (f.formato === 'imagen') {
      if (!f.imagen_desktop_url.trim()) faltan.push('Falta la imagen de escritorio.');
      else if (!esHttps(f.imagen_desktop_url)) faltan.push('La imagen de escritorio tiene que ser una URL https.');

      if (!f.imagen_movil_url.trim()) {
        faltan.push('Falta la imagen móvil: sin ella el ad se ve roto en la mitad del tráfico.');
      } else if (!esHttps(f.imagen_movil_url)) {
        faltan.push('La imagen móvil tiene que ser una URL https.');
      }

      if (!f.alt.trim()) faltan.push('Falta el texto alternativo, que es lo que lee un lector de pantalla.');
    } else if (!f.html.trim()) {
      faltan.push('Pega el HTML de la pieza.');
    }

    for (const p of [altoInvalido(f.alto_desktop, 'de escritorio'), altoInvalido(f.alto_movil, 'móvil')]) {
      if (p) faltan.push(p);
    }
  }

  if (paso === 'donde') {
    if (f.ubicaciones.length === 0) faltan.push('Elige al menos una ubicación.');
    // En imagen el link es el único destino posible; en HTML los enlaces van
    // dentro de la pieza, asi que ahi es opcional.
    if (f.formato === 'imagen' && !f.link.trim()) {
      faltan.push('Un ad de imagen necesita un link de destino.');
    }
    if (f.link.trim() && !esHttp(f.link)) faltan.push('El link tiene que empezar en http:// o https://.');
  }

  return faltan;
}

/** Todo lo que falta, para poder decirlo junto en la revisión. */
export function problemasDeTodo(f: FormularioAd): string[] {
  return PASOS.flatMap(p => problemasDelPaso(p.id, f));
}
