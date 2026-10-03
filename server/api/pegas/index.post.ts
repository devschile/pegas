import { createError, defineEventHandler, readBody, setResponseStatus } from 'h3';
import { buscarPegaPorUrl, crearPega } from '../../utils/pegas-db';
import { validarPegaEntrada } from '../../utils/pegas-validacion';

/**
 * Alta manual desde el panel de admin -- ver `server/utils/pegas-db.ts` y
 * `PanelAgregarPega.vue`. El pipeline automático (ver README) sigue siendo
 * la fuente normal; esto es para lo que llega por un canal que ese pipeline
 * no cubre, como un aviso compartido en Slack.
 */
export default defineEventHandler(async event => {
  await requireAdmin(event);

  const r = validarPegaEntrada(await readBody(event));
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  // Se revisa antes del INSERT para devolver un mensaje con la pega
  // existente en vez del error crudo de la UNIQUE de `url` -- esa
  // constraint sigue siendo la protección real; esto solo da mejor mensaje.
  const existente = await buscarPegaPorUrl(r.valor.url);
  if (existente) {
    throw createError({
      statusCode: 409,
      message: `Ya hay una pega con esa URL: "${existente.titulo}" (#${existente.id})`,
    });
  }

  const pega = await crearPega(r.valor);
  setResponseStatus(event, 201);
  return pega;
});
