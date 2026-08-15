import type { PegasData } from '~/types/pega';

/**
 * Fuente de datos actual: el data.json estatico que ya genera el pipeline
 * de PostgreSQL -> n8n (ver scripts/generate-json.js en la raiz del repo).
 * Cuando exista la API REST, solo esta funcion cambia -- el resto de la app
 * consume `pegas`/`categorias`/`fuentes` sin saber de donde vienen.
 */
export function usePegas() {
  const config = useRuntimeConfig();

  return useFetch<PegasData>(config.public.dataJsonUrl, {
    key: 'pegas-data',
  });
}
