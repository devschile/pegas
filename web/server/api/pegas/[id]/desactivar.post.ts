import { createError, defineEventHandler, getRouterParam } from 'h3';
import { parseJobId } from '../[id].get';
import { query } from '../../../utils/db';

export async function desactivarPega(id: number): Promise<void> {
  await query('UPDATE pegas SET activo = FALSE, fecha_actualizacion = NOW() WHERE id = $1', [id]);
}

export default defineEventHandler(async event => {
  await requireAdmin(event);

  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  await desactivarPega(id);
  return { ok: true };
});
