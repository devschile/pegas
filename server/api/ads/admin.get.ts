import { defineEventHandler } from 'h3';
import { listarAdsAdmin } from '../../utils/ads-db';

export default defineEventHandler(async event => {
  await requireAdmin(event);
  return listarAdsAdmin();
});
