import { createError, defineEventHandler, getRouterParam } from 'h3';
import { parseAdId } from './parse-id';
import { borrarAd } from '../../utils/ads-db';

export default defineEventHandler(async event => {
  const { userId } = await requireAdmin(event);

  const id = parseAdId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const borrado = await borrarAd(id, userId);
  if (!borrado) throw createError({ statusCode: 404, message: 'ad no encontrado' });
  return { ok: true };
});
