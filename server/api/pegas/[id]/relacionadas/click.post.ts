import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseJobId } from '../../[id].get';
import { recordEvent, validateEvent } from '../../../../utils/relacionadas-eventos';

/**
 * Solo cuenta; no redirige. A diferencia de un ad, el destino de una
 * relacionada es una página de este mismo sitio, así que el enlace es un
 * `NuxtLink` de verdad —rastreable, abrible en pestaña nueva, con su URL a la
 * vista— y no hay motivo para hacerlo pasar por un redirector.
 */
export default defineEventHandler(async event => {
  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const r = validateEvent(await readBody(event), id, 'click');
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  await recordEvent(r.valor);
  return { ok: true };
});
