import { createError, defineEventHandler, getRouterParam } from 'h3';
import { parseJobId } from '../[id].get';
import { query } from '../../../utils/db';

/** Contraparte de desactivarPega: deshace una desactivación desde /mis-pegas. */
export async function activarPega(id: number): Promise<void> {
  await query('UPDATE pegas SET activo = TRUE, fecha_actualizacion = NOW() WHERE id = $1', [id]);
}

export default defineEventHandler(async event => {
  await requireAdmin(event);

  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  await activarPega(id);
  return { ok: true };
});
