import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseAdId } from '../parse-id';
import { registrarEvento, validarEvento } from '../../../utils/ads-eventos';

/**
 * Click de un ad de formato HTML. Solo cuenta; no redirige.
 *
 * El enlace vive dentro del iframe y puede ser cualquiera de los que trae la
 * pieza, así que el destino no está en la base y no se puede resolver acá sin
 * convertir esto en un redirector abierto. El host abre la URL por su cuenta,
 * después de validarle el protocolo.
 */
export default defineEventHandler(async event => {
  const id = parseAdId(getRouterParam(event, 'id'));
  if (id === null) throw createError({ statusCode: 400, message: 'id inválido' });

  const r = validarEvento(await readBody(event), id, 'click');
  if (!r.ok) throw createError({ statusCode: 400, message: r.error });

  await registrarEvento(r.valor);
  return { ok: true };
});
