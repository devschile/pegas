import { createError, defineEventHandler, getQuery, getRouterParam, sendRedirect } from 'h3';
import { parseAdId } from '../parse-id';
import { linkDelAd, registrarEvento, validarEvento } from '../../../utils/ads-eventos';

/**
 * Click de un ad de imagen: cuenta y redirige.
 *
 * El destino sale de la base y no de la query string — si lo aceptara como
 * parámetro esto sería un redirector abierto, o sea un link que empieza en
 * pegas.devschile.cl y termina donde quiera el que lo arme.
 *
 * Es un GET porque cuelga de un <a> real: así el click del medio, "abrir en
 * pestaña nueva" y el botón derecho funcionan como en cualquier enlace.
 */
export default defineEventHandler(async event => {
  const id = parseAdId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const destino = await linkDelAd(id);
  if (!destino) throw createError({ statusCode: 404, message: 'ad sin destino' });

  const r = validarEvento(getQuery(event), id, 'click');
  // Un click con metadatos malformados se cuenta igual, sin dimensiones: la
  // persona hizo click de verdad y perder el evento sería peor que perder el
  // detalle de dónde estaba.
  await registrarEvento(
    r.ok ? r.valor : { ad_id: id, tipo: 'click', ubicacion: 'header', posicion: null, pagina: null, dispositivo: 'desktop' },
  ).catch(() => {});

  return sendRedirect(event, destino, 302);
});
