import { defineEventHandler, getQuery } from 'h3';
import { estadisticas, parseRango, resumirEstadisticas } from '../../utils/ads-stats';

export default defineEventHandler(async event => {
  await requireAdmin(event);

  const { desde, hasta } = parseRango(getQuery(event) as Record<string, unknown>);
  const filas = await estadisticas(desde, hasta);
  return { desde, hasta, ads: resumirEstadisticas(filas) };
});
