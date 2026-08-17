import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseJobId } from '../[id].get';
import type { Reaction } from '../../../utils/reacciones';

/** `undefined` = body inválido; `null` explícito significa "sacar la reacción". */
export function parseReactionBody(body: unknown): Reaction | null | undefined {
  if (body && typeof body === 'object' && 'reaccion' in body) {
    const value = (body as { reaccion: unknown }).reaccion;
    if (value === 'like' || value === 'dislike' || value === null) return value;
  }
  return undefined;
}

export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event);

  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  const reaccion = parseReactionBody(await readBody(event));
  if (reaccion === undefined) {
    throw createError({ statusCode: 400, message: 'reaccion inválida' });
  }

  return setReaction(user.id, id, reaccion);
});
