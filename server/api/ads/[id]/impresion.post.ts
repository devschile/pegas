import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseAdId } from '../parse-id';
import { registrarEvento, validarEvento } from '../../../utils/ads-eventos';

/**
 * Una impresión es que el ad haya entrado en pantalla, no que se haya
 * renderizado: un banner en el pie que nadie scrolleó no es una impresión, y
 * contarlo así solo infla nuestros propios números.
 */
export default defineEventHandler(async event => {
  const id = parseAdId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const r = validarEvento(await readBody(event), id, 'impresion');
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  await registrarEvento(r.valor);
  return { ok: true };
});
