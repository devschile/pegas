import { defineEventHandler, getQuery } from 'h3';
import { listarLog } from '../../utils/ads-db';

export default defineEventHandler(async event => {
  await requireAdmin(event);
  const limite = Number(getQuery(event).limite);
  return listarLog(Number.isFinite(limite) ? limite : 100);
});
