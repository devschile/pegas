import { validarLink } from './ads-sanitize';

/**
 * Validación de lo que llega a los endpoints de escritura del panel.
 *
 * La base ya impone estas reglas con CHECKs, y esa es la última línea de
 * defensa. Esto va antes por dos razones: para poder devolver un mensaje que
 * diga qué está mal en vez de un error de Postgres, y porque en un par de
 * puntos la API es **más estricta** que la base — las imágenes acá tienen que
 * ser https, mientras que la base acepta además rutas del propio sitio, que
 * es como entran los datos de ejemplo de `dev/` sin pasar por la API.
 */

export const UBICACIONES_VALIDAS = ['header', 'listado', 'footer'] as const;
export type Ubicacion = (typeof UBICACIONES_VALIDAS)[number];

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: string };

export interface AdEntrada {
  empresa_id: number;
  nombre: string;
  formato: 'imagen' | 'html';
  imagen_desktop_url: string | null;
  imagen_movil_url: string | null;
  alt: string | null;
  html: string | null;
  alto_desktop: number | null;
  alto_movil: number | null;
  link: string | null;
  activo: boolean;
  ubicaciones: Ubicacion[];
  inicia_en: string | null;
  termina_en: string | null;
}

export interface EmpresaEntrada {
  nombre: string;
  slug: string;
  sitio_url: string | null;
  contacto_email: string | null;
  activo: boolean;
  es_casa: boolean;
}

const objeto = (b: unknown): Record<string, unknown> | null =>
  typeof b === 'object' && b !== null && !Array.isArray(b) ? (b as Record<string, unknown>) : null;

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

/** Una imagen la sirve el navegador de todos los visitantes: solo https. */
function imagenValida(v: unknown): string | null {
  const s = texto(v);
  return s && /^https:\/\//i.test(s) ? s : null;
}

function enteroEnRango(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

/** ISO 8601; se guarda tal cual para que Postgres resuelva el huso. */
function fecha(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  return Number.isNaN(Date.parse(s)) ? null : s;
}

function ubicaciones(v: unknown): Ubicacion[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const vistas = new Set<string>();
  for (const u of v) {
    if (typeof u !== 'string') return null;
    if (!(UBICACIONES_VALIDAS as readonly string[]).includes(u)) return null;
    // Repetir una ubicación no rompe nada pero delata un error del cliente, y
    // duplicaría el peso del ad en el sorteo de esa ubicación.
    if (vistas.has(u)) return null;
    vistas.add(u);
  }
  return v as Ubicacion[];
}

export function validarAd(body: unknown): Resultado<AdEntrada> {
  const b = objeto(body);
  if (!b) return { ok: false, error: 'el cuerpo debe ser un objeto' };

  const empresa_id = enteroEnRango(b.empresa_id, 1, Number.MAX_SAFE_INTEGER);
  if (empresa_id === null) return { ok: false, error: 'empresa_id debe ser un entero positivo' };

  const nombre = texto(b.nombre);
  if (!nombre) return { ok: false, error: 'nombre es obligatorio' };

  if (b.formato !== 'imagen' && b.formato !== 'html') {
    return { ok: false, error: "formato debe ser 'imagen' u 'html'" };
  }

  const ubis = ubicaciones(b.ubicaciones);
  if (!ubis) {
    return { ok: false, error: `ubicaciones debe traer al menos una de ${UBICACIONES_VALIDAS.join(', ')}, sin repetir` };
  }

  const alto_desktop = b.alto_desktop == null ? null : enteroEnRango(b.alto_desktop, 1, 600);
  if (b.alto_desktop != null && alto_desktop === null) {
    return { ok: false, error: 'alto_desktop debe ser un entero entre 1 y 600' };
  }
  const alto_movil = b.alto_movil == null ? null : enteroEnRango(b.alto_movil, 1, 600);
  if (b.alto_movil != null && alto_movil === null) {
    return { ok: false, error: 'alto_movil debe ser un entero entre 1 y 600' };
  }

  const inicia_en = b.inicia_en == null ? null : fecha(b.inicia_en);
  if (b.inicia_en != null && inicia_en === null) return { ok: false, error: 'inicia_en no es una fecha válida' };
  const termina_en = b.termina_en == null ? null : fecha(b.termina_en);
  if (b.termina_en != null && termina_en === null) return { ok: false, error: 'termina_en no es una fecha válida' };
  if (inicia_en && termina_en && Date.parse(termina_en) <= Date.parse(inicia_en)) {
    return { ok: false, error: 'termina_en tiene que ser posterior a inicia_en' };
  }

  const link = b.link == null ? null : validarLink(b.link);
  if (b.link != null && link === null) {
    return { ok: false, error: 'link tiene que ser una URL http o https' };
  }

  const base = {
    empresa_id,
    nombre,
    ubicaciones: ubis,
    alto_desktop,
    alto_movil,
    inicia_en,
    termina_en,
    activo: b.activo === true,
  };

  if (b.formato === 'imagen') {
    const desktop = imagenValida(b.imagen_desktop_url);
    const movil = imagenValida(b.imagen_movil_url);
    if (!desktop || !movil) {
      // Sin la versión móvil el ad se ve roto en la mitad del tráfico, así que
      // se piden las dos y no se acepta una sola "que se adapte".
      return { ok: false, error: 'un ad de imagen necesita imagen_desktop_url e imagen_movil_url, ambas https' };
    }
    if (!link) return { ok: false, error: 'un ad de imagen necesita link: una imagen sin destino no es un banner' };
    const alt = texto(b.alt);
    if (!alt) return { ok: false, error: 'alt es obligatorio en un ad de imagen, para quien usa lector de pantalla' };
    if (b.html != null) return { ok: false, error: 'un ad de imagen no lleva html' };

    return {
      ok: true,
      valor: { ...base, formato: 'imagen', imagen_desktop_url: desktop, imagen_movil_url: movil, alt, html: null, link },
    };
  }

  const html = texto(b.html);
  if (!html) return { ok: false, error: 'un ad de html necesita el campo html' };
  if (b.imagen_desktop_url != null || b.imagen_movil_url != null) {
    return { ok: false, error: 'un ad de html no lleva imágenes' };
  }

  return {
    ok: true,
    valor: {
      ...base,
      formato: 'html',
      imagen_desktop_url: null,
      imagen_movil_url: null,
      alt: texto(b.alt),
      html,
      link,
    },
  };
}

export function validarEmpresa(body: unknown): Resultado<EmpresaEntrada> {
  const b = objeto(body);
  if (!b) return { ok: false, error: 'el cuerpo debe ser un objeto' };

  const nombre = texto(b.nombre);
  if (!nombre) return { ok: false, error: 'nombre es obligatorio' };

  const slug = texto(b.slug);
  // El mismo formato que impone el CHECK de la migración. El slug entra en
  // URLs y en nombres de archivo de los informes, así que se acota acá.
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: 'slug debe ser minúsculas, números y guiones (ej: panguipulli-labs)' };
  }

  const sitio_url = b.sitio_url == null ? null : validarLink(b.sitio_url);
  if (b.sitio_url != null && sitio_url === null) {
    return { ok: false, error: 'sitio_url tiene que ser una URL http o https' };
  }

  const contacto_email = b.contacto_email == null ? null : texto(b.contacto_email);
  if (contacto_email !== null && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(contacto_email)) {
    return { ok: false, error: 'contacto_email no parece un correo' };
  }

  return {
    ok: true,
    valor: {
      nombre,
      slug,
      sitio_url,
      contacto_email,
      // Una empresa nueva arranca prendida; lo que arranca apagado es el ad.
      activo: b.activo !== false,
      es_casa: b.es_casa === true,
    },
  };
}
