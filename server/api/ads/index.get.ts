import { defineEventHandler, getQuery } from 'h3';
import { query } from '../../utils/db';

/**
 * Las tres ubicaciones que un ad puede ocupar. Es la misma lista que impone
 * el CHECK `ads_ubicaciones_validas` en la migracion 007: si acá se agrega
 * una, hay que agregarla allá también o la base rechaza la fila.
 */
export const UBICACIONES = ['header', 'listado', 'footer'] as const;
export type Ubicacion = (typeof UBICACIONES)[number];

/**
 * Lo que se expone públicamente de un ad. Deliberadamente NO incluye
 * `nombre` (es la etiqueta interna del panel), `creado_por`, las fechas ni
 * `activo`: son metadatos de administración y este endpoint lo lee
 * cualquiera sin sesión.
 */
export interface AdPublico {
  id: number;
  tipo: 'imagen' | 'html';
  imagen_url: string | null;
  alt: string | null;
  html: string | null;
  link: string | null;
  ubicaciones: Ubicacion[];
}

/**
 * La ubicación llega por query string, o sea es entrada de usuario. Se
 * compara contra la lista cerrada en vez de pasarla a SQL: aunque la
 * consulta va parametrizada, un valor que no es de la lista solo puede ser
 * un error o una sonda, y devolver todo es mejor que devolver un 500.
 */
export function parseUbicacion(raw: unknown): Ubicacion | null {
  return typeof raw === 'string' && (UBICACIONES as readonly string[]).includes(raw)
    ? (raw as Ubicacion)
    : null;
}

export async function getAdsActivos(ubicacion: Ubicacion | null = null): Promise<AdPublico[]> {
  const { rows } = await query<AdPublico>(
    `SELECT id, tipo, imagen_url, alt, html, link, ubicaciones
     FROM ads
     WHERE activo
       AND ($1::text IS NULL OR $1 = ANY (ubicaciones))
     ORDER BY id`,
    [ubicacion],
  );
  return rows;
}

export default defineEventHandler(async event => {
  return getAdsActivos(parseUbicacion(getQuery(event).ubicacion));
});
