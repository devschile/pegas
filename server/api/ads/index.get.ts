import { defineEventHandler, getQuery } from 'h3';
import { query } from '../../utils/db';

/**
 * Las tres ubicaciones que un ad puede ocupar. Es la misma lista que impone el
 * CHECK `ads_ubicaciones_validas` en la migración 007: si acá se agrega una,
 * hay que agregarla allá también o la base rechaza la fila.
 */
export const UBICACIONES = ['header', 'listado', 'footer'] as const;
export type Ubicacion = (typeof UBICACIONES)[number];

/**
 * Lo que se expone públicamente de un ad. Deliberadamente NO incluye el
 * `nombre` interno, `creado_por`, las fechas de vigencia, `activo` ni los
 * datos de contacto de la empresa: son metadatos de administración y este
 * endpoint lo lee cualquiera sin sesión.
 *
 * `empresa_nombre` y `es_casa` sí van: el primero para poder declarar de quién
 * es la publicidad, y el segundo porque un ad de casa se rotula distinto
 * ("este espacio está disponible") en vez de hacerse pasar por vendido.
 */
export interface AdPublico {
  id: number;
  formato: 'imagen' | 'html';
  imagen_desktop_url: string | null;
  imagen_movil_url: string | null;
  alt: string | null;
  html: string | null;
  alto_desktop: number | null;
  alto_movil: number | null;
  link: string | null;
  empresa_nombre: string;
  es_casa: boolean;
}

export type AdsPorUbicacion = Record<Ubicacion, AdPublico | null>;

/**
 * La ubicación llega por query string, o sea es entrada de usuario. Se compara
 * contra la lista cerrada en vez de pasarla a SQL: aunque la consulta va
 * parametrizada, un valor que no está en la lista solo puede ser un error o
 * una sonda, y devolver todo es mejor que devolver un 500.
 */
export function parseUbicacion(raw: unknown): Ubicacion | null {
  return typeof raw === 'string' && (UBICACIONES as readonly string[]).includes(raw)
    ? (raw as Ubicacion)
    : null;
}

/**
 * Elegibles: el ad está prendido, su empresa está prendida (apagar la empresa
 * baja todos sus ads de una vez) y hoy cae dentro de la vigencia, si es que
 * tiene. Las fechas se comparan en la base y no en Node para que el huso sea
 * el del servidor de datos y no el del proceso.
 */
export async function getAdsElegibles(ubicacion: Ubicacion | null = null): Promise<AdPublico[]> {
  const { rows } = await query<AdPublico & { ubicaciones: Ubicacion[] }>(
    `SELECT a.id, a.formato, a.imagen_desktop_url, a.imagen_movil_url, a.alt, a.html,
            a.alto_desktop, a.alto_movil, a.link, a.ubicaciones,
            e.nombre AS empresa_nombre, e.es_casa
     FROM ads a
     JOIN empresas e ON e.id = a.empresa_id
     WHERE a.activo
       AND e.activo
       AND (a.inicia_en IS NULL OR a.inicia_en <= now())
       AND (a.termina_en IS NULL OR a.termina_en > now())
       AND ($1::text IS NULL OR $1 = ANY (a.ubicaciones))
     ORDER BY a.id`,
    [ubicacion],
  );
  return rows;
}

/**
 * Elige cuál mostrar entre los que compiten por una ubicación.
 *
 * Lo vendido le gana siempre a lo de casa: un ad de casa existe para que la
 * ubicación no se vea vacía, no para competir con un anunciante que pagó. Y
 * entre los que quedan empatados se sortea, así dos campañas activas en la
 * misma ubicación se reparten las impresiones en vez de que la primera se las
 * lleve todas.
 *
 * `azar` se inyecta para poder testear el desempate sin depender de Math.random.
 */
export function elegirAd(
  candidatos: AdPublico[],
  azar: () => number = Math.random,
): AdPublico | null {
  if (candidatos.length === 0) return null;
  const vendidos = candidatos.filter(a => !a.es_casa);
  const pool = vendidos.length > 0 ? vendidos : candidatos;
  return pool[Math.floor(azar() * pool.length)] ?? pool[0];
}

export async function getAdsPorUbicacion(azar: () => number = Math.random): Promise<AdsPorUbicacion> {
  const elegibles = await getAdsElegibles();
  const salida = {} as AdsPorUbicacion;
  for (const u of UBICACIONES) {
    const candidatos = elegibles.filter(a =>
      (a as AdPublico & { ubicaciones: Ubicacion[] }).ubicaciones.includes(u),
    );
    salida[u] = limpiar(elegirAd(candidatos, azar));
  }
  return salida;
}

/** `ubicaciones` se usa para repartir, pero no tiene por qué salir al cliente. */
export function limpiar(ad: AdPublico | null): AdPublico | null {
  if (!ad) return null;
  const { ubicaciones, ...resto } = ad as AdPublico & { ubicaciones?: Ubicacion[] };
  void ubicaciones;
  return resto;
}

/**
 * Sin `ubicacion` devuelve las tres de una vez, que es lo que necesita una
 * página para renderizarse completa sin encadenar llamadas. Con `ubicacion`
 * devuelve solo esa.
 */
export default defineEventHandler(async event => {
  const ubicacion = parseUbicacion(getQuery(event).ubicacion);
  const todas = await getAdsPorUbicacion();
  return ubicacion ? { [ubicacion]: todas[ubicacion] } : todas;
});
