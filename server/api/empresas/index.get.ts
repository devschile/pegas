import { defineEventHandler } from 'h3';
import { listarEmpresas } from '../../utils/ads-db';

export default defineEventHandler(async event => {
  await requireAdmin(event);
  return listarEmpresas();
});
