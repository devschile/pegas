import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3';
import { crearAd } from '../../utils/ads-db';
import { validarAd } from '../../utils/ads-validacion';

export default defineEventHandler(async event => {
  const { userId } = await requireAdmin(event);

  const r = validarAd(await readBody(event));
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  const ad = await crearAd(r.valor, userId);
  setResponseStatus(event, 201);
  return ad;
});
