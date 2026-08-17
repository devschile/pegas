import { computed, watch, ref } from 'vue';
import { debounce } from '~/utils/debounce';
import type { JobsFilters } from './useJobs';

const DEBOUNCE_MS = 300;

function readStringParam(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readPageParam(value: unknown): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * Estado de filtros y paginación del listado de pegas. El filtrado y
 * paginado en sí corren en SQL (ver server/api/pegas/) -- acá queda el
 * estado reactivo: reset de página al cambiar filtros, sync con la query
 * string (deep-link y botón atrás) y debounce de la búsqueda, porque cada
 * tecla ahora dispara una request.
 */
export function useJobsListing() {
  const route = useRoute();
  const router = useRouter();

  const query = ref(readStringParam(route.query.q));
  const debouncedQuery = ref(query.value);
  const source = ref(readStringParam(route.query.fuente));
  const page = ref(readPageParam(route.query.pagina));

  const applyDebouncedQuery = debounce((value: string) => {
    debouncedQuery.value = value;
  }, DEBOUNCE_MS);
  watch(query, value => applyDebouncedQuery(value));

  /** Cualquier cambio de filtro vuelve a la página 1, igual que en el sitio anterior. */
  watch([debouncedQuery, source], () => {
    page.value = 1;
  });

  watch([debouncedQuery, source, page], ([q, fuente, pagina]) => {
    router.replace({
      query: {
        ...(q ? { q } : {}),
        ...(fuente ? { fuente } : {}),
        ...(pagina > 1 ? { pagina: String(pagina) } : {}),
      },
    });
  });

  const filters = computed<JobsFilters>(() => ({
    q: debouncedQuery.value,
    categoria: '',
    fuente: source.value,
    pagina: page.value,
  }));

  function nextPage() {
    page.value++;
  }

  function prevPage() {
    if (page.value > 1) page.value--;
  }

  return { query, source, page, filters, nextPage, prevPage };
}
