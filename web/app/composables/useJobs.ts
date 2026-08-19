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
 *
 * La key es dinámica (no una constante fija) porque index.vue y
 * categoria/[categoria].vue llaman a este mismo composable -- con una key
 * fija, navegar de una a otra (SPA, sin recarga) reusaba la respuesta
 * cacheada de la primera pagina en vez de pedir una nueva con el filtro de
 * categoria, y el listado quedaba sin filtrar.
 */
export function useJobs(filters: Ref<JobsFilters>) {
  return useFetch<PegasListado>('/api/pegas', {
    key: () => `pegas-data-${JSON.stringify(filters.value)}`,
    query: filters,
  });
}
