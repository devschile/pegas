import { defineEventHandler, getQuery } from 'h3';

/** "1,2,3" -> [1,2,3]; descarta cualquier valor que no sea un entero. */
export function parseIdsParam(raw: unknown): number[] {
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (typeof str !== 'string' || !str) return [];
  return str
    .split(',')
    .map(part => Number(part))
    .filter(Number.isInteger);
}

export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event);
  const ids = parseIdsParam(getQuery(event).ids);
  return getPegaStatesFor(user.id, ids);
});
