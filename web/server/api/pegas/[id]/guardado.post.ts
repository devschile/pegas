import { createError, defineEventHandler, getRouterParam, readBody } from 'h3';
import { parseJobId } from '../[id].get';

export function parseSavedBody(body: unknown): boolean | undefined {
  if (body && typeof body === 'object' && 'guardada' in body) {
    const value = (body as { guardada: unknown }).guardada;
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event);

  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  const guardada = parseSavedBody(await readBody(event));
  if (guardada === undefined) {
    throw createError({ statusCode: 400, message: 'guardada inválida' });
  }

  return setSaved(user.id, id, guardada);
});
