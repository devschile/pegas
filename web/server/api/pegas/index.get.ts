import { defineEventHandler, getQuery } from 'h3';
import { query } from '../../utils/db';
import type { Pega } from '~/types/pega';

export interface ListarPegasParams {
  q: string;
  categoria: string;
  fuente: string;
  pagina: number;
  porPagina: number;
}

export interface ListarPegasResult {
  total: number;
  pagina: number;
  porPagina: number;
  pegas: Pega[];
}

const PORPAGINA_DEFAULT = 25;
const PORPAGINA_MAX = 50;

function toStringParam(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}

function toIntParam(value: unknown, fallback: number): number {
  const parsed = parseInt(toStringParam(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * `pagina`/`porPagina` de un query string son entrada de usuario: se
 * clampean acá (nunca en SQL) para que un valor negativo o absurdo no
 * termine en un LIMIT/OFFSET inválido.
 */
export function parseListarPegasQuery(raw: Record<string, unknown>): ListarPegasParams {
  const pagina = Math.max(1, toIntParam(raw.pagina, 1));
  const porPagina = Math.min(PORPAGINA_MAX, Math.max(1, toIntParam(raw.porPagina, PORPAGINA_DEFAULT)));

  return {
    q: toStringParam(raw.q).trim(),
    categoria: toStringParam(raw.categoria).trim(),
    fuente: toStringParam(raw.fuente).trim(),
    pagina,
    porPagina,
  };
}

/**
 * Mismo orden que `scripts/generate-json.js`: GREATEST entre fecha de
 * publicación e ingesta para que una pega recién ingerida desde una fuente
 * con historial (ej. WorkingNomads) no quede enterrada al fondo del
 * listado. Búsqueda replica el haystack de `useJobsListing.ts`.
 */
export async function listarPegas(params: ListarPegasParams): Promise<ListarPegasResult> {
  const filters = ['activo = TRUE'];
  const values: unknown[] = [];

  if (params.categoria) {
    values.push(params.categoria);
    filters.push(`categoria = $${values.length}`);
  }
  if (params.fuente) {
    values.push(params.fuente);
    filters.push(`fuente = $${values.length}`);
  }
  if (params.q) {
    values.push(`%${params.q}%`);
    filters.push(`(titulo || ' ' || empleador || ' ' || descripcion || ' ' || categoria) ILIKE $${values.length}`);
  }

  const where = filters.join(' AND ');

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) FROM pegas WHERE ${where}`,
    values,
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);

  const limitIndex = values.length + 1;
  const offsetIndex = values.length + 2;
  const { rows: pegas } = await query<Pega>(
    `SELECT id, url, titulo, empleador, descripcion, categoria, ubicacion, sueldo, tags,
            fecha_publicacion, fuente, fecha_creacion
     FROM pegas
     WHERE ${where}
     ORDER BY GREATEST(COALESCE(fecha_publicacion, fecha_creacion), fecha_creacion) DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    [...values, params.porPagina, (params.pagina - 1) * params.porPagina],
  );

  return { total, pagina: params.pagina, porPagina: params.porPagina, pegas };
}

export default defineEventHandler(event => listarPegas(parseListarPegasQuery(getQuery(event))));
