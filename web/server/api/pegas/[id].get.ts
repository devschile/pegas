import { createError, defineEventHandler, getRouterParam } from 'h3';
import { query } from '../../utils/db';
import type { Pega } from '~/types/pega';

/** `null` para cualquier id que no sea un entero positivo, incluido no-numérico. */
export function parsePegaId(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function obtenerPega(id: number): Promise<Pega | null> {
  const { rows } = await query<Pega>(
    `SELECT id, url, titulo, empleador, descripcion, categoria, ubicacion, sueldo, tags,
            fecha_publicacion, fuente, fecha_creacion
     FROM pegas
     WHERE id = $1 AND activo = TRUE`,
    [id],
  );
  return rows[0] ?? null;
}

export default defineEventHandler(async event => {
  const id = parsePegaId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  const pega = await obtenerPega(id);
  if (!pega) {
    throw createError({ statusCode: 404, message: 'Pega no encontrada' });
  }

  return pega;
});
