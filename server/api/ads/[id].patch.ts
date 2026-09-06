import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseAdId } from './parse-id';
import { actualizarAd } from '../../utils/ads-db';
import { validarAd } from '../../utils/ads-validacion';

export default defineEventHandler(async event => {
  const { userId } = await requireAdmin(event);

  const id = parseAdId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const r = validarAd(await readBody(event));
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  const ad = await actualizarAd(id, r.valor, userId);
  if (!ad) throw createError({ statusCode: 404, message: 'ad no encontrado' });
  return ad;
});
