import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseAdId } from '../ads/parse-id';
import { actualizarEmpresa } from '../../utils/ads-db';
import { validarEmpresa } from '../../utils/ads-validacion';

export default defineEventHandler(async event => {
  const { userId } = await requireAdmin(event);

  const id = parseAdId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const r = validarEmpresa(await readBody(event));
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  const empresa = await actualizarEmpresa(id, r.valor, userId);
  if (!empresa) throw createError({ statusCode: 404, message: 'empresa no encontrada' });
  return empresa;
});
