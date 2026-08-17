import type { Ref } from 'vue';
import type { PegasListado } from '~/types/pega';

export interface JobsFilters {
  q: string;
  categoria: string;
  fuente: string;
  pagina: number;
}

/**
 * Fuente de datos: API REST respaldada por Postgres (ver server/api/pegas/).
 * `useFetch` con `query` reactivo re-consulta solo al cambiar algún filtro.
 */
export function useJobs(filters: Ref<JobsFilters>) {
  return useFetch<PegasListado>('/api/pegas', {
    key: 'pegas-data',
    query: filters,
  });
}
