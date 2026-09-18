import { createError, defineEventHandler, getRouterParam } from 'h3';
import { parseJobId } from '../[id].get';
import { getRelatedJobs } from '../../../utils/relacionadas';

/**
 * Dos y no más: el bloque va al pie de un aviso que la persona vino a leer, y
 * a partir de la tercera deja de ser una sugerencia para volverse otro
 * listado, que es lo que ya hay en la portada.
 */
export const RELACIONADAS_POR_PEGA = 2;

/**
 * No comprueba que la pega exista: si no existe, no tiene aristas y la
 * respuesta es una lista vacía igual. Un 404 acá solo agregaría una consulta
 * para decir lo mismo.
 */
export default defineEventHandler(async event => {
  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  return getRelatedJobs(id, RELACIONADAS_POR_PEGA);
});
