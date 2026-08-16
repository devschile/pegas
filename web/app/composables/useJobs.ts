import type { PegasData } from '~/types/pega';

/**
 * Fuente de datos actual: el data.json estático que ya genera el pipeline
 * de PostgreSQL -> n8n (ver scripts/generate-json.js en la raíz del repo).
 * Cuando exista la API REST, solo esta función cambia — el resto de la app
 * consume `pegas`/`categorias`/`fuentes` sin saber de dónde vienen.
 */
export function useJobs() {
  const config = useRuntimeConfig();

  return useFetch<PegasData>(config.public.dataJsonUrl, {
    key: 'pegas-data',
  });
}
