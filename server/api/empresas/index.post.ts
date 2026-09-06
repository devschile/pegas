import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3';
import { crearEmpresa } from '../../utils/ads-db';
import { validarEmpresa } from '../../utils/ads-validacion';

export default defineEventHandler(async event => {
  const { userId } = await requireAdmin(event);

  const r = validarEmpresa(await readBody(event));
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  const empresa = await crearEmpresa(r.valor, userId);
  setResponseStatus(event, 201);
  return empresa;
});
