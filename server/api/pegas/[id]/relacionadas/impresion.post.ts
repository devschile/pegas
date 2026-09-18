import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseJobId } from '../../[id].get';
import { recordEvent, validateEvent } from '../../../../utils/relacionadas-eventos';

/**
 * Una relacionada impresa es una que entró en pantalla, no una que se
 * renderizó: el bloque vive al final de la página y la mayoría de las visitas
 * no llega a verlo. Contar el render inflaría el denominador y haría parecer
 * que la recomendación no funciona.
 */
export default defineEventHandler(async event => {
  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const r = validateEvent(await readBody(event), id, 'impresion');
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  await recordEvent(r.valor);
  return { ok: true };
});
