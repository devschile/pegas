import { computed, watch } from 'vue';
import type { Ref } from 'vue';
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

export interface JobsListingRefs {
  query: Ref<string>;
  debouncedQuery: Ref<string>;
  source: Ref<string>;
  page: Ref<number>;
}

interface JobsListingDeps {
  categoriaParam: Ref<string | string[] | undefined>;
  replaceQuery: (query: { q?: string; fuente?: string; pagina?: string }) => void;
}

/**
 * Lógica pura de useJobsListing(): arma los watchers de debounce, reset de
 * página y sync a la URL sobre refs ya creados -- separado de la creación
 * de esos refs (que en la app real son useState compartidos, no
 * testeables sin mockear ese auto-import) para poder testear el
 * comportamiento con refs planos, mismo patrón que
 * usePegaReactions/createPegaReactionsStore.
 */
export function createJobsListingStore(refs: JobsListingRefs, deps: JobsListingDeps) {
  const { query, debouncedQuery, source, page } = refs;

  const applyDebouncedQuery = debounce((value: string) => {
    debouncedQuery.value = value;
  }, DEBOUNCE_MS);
  watch(query, value => applyDebouncedQuery(value));

  /** Cualquier cambio de filtro vuelve a la página 1, igual que en el sitio anterior. */
  watch([debouncedQuery, source], () => {
    page.value = 1;
  });

  /**
   * Cambiar de categoría es navegar a una ruta distinta (/categoria/X) --
   * también vuelve a la página 1. Esto vive en el store porque
   * useJobsListing() (el único caller de este store) se llama una sola
   * vez, desde el layout persistente -- así que sí alcanza a ver la
   * transición completa entre páginas.
   */
  watch(deps.categoriaParam, () => {
    page.value = 1;
  });

  watch([debouncedQuery, source, page], ([q, fuente, pagina]) => {
    deps.replaceQuery({
      ...(q ? { q } : {}),
      ...(fuente ? { fuente } : {}),
      ...(pagina > 1 ? { pagina: String(pagina) } : {}),
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

/**
 * Estado de filtros y paginación del listado de pegas -- query/fuente/pagina
 * compartidos via useState (no ref plano) porque la barra de filtros vive en
 * app/layouts/listado.vue, persistente entre index.vue y
 * categoria/[categoria].vue (no se remonta al navegar entre ellas), así que
 * el estado tiene que sobrevivir ese cambio de página en vez de reiniciarse.
 *
 * Se llama UNA SOLA VEZ, desde el layout. Las páginas que solo necesitan
 * leer el estado compartido (para su propio `filters`/paginación) usan
 * `useJobsListingState()` en vez de esta -- llamar a esta función más de una
 * vez registraría watchers duplicados sobre el mismo estado compartido.
 */
export function useJobsListing() {
  const route = useRoute();
  const router = useRouter();

  const refs: JobsListingRefs = {
    query: useState('listado-query', () => readStringParam(route.query.q)),
    debouncedQuery: useState('listado-debounced-query', () => readStringParam(route.query.q)),
    source: useState('listado-source', () => readStringParam(route.query.fuente)),
    page: useState('listado-page', () => readPageParam(route.query.pagina)),
  };

  return createJobsListingStore(refs, {
    categoriaParam: computed(() => route.params.categoria),
    replaceQuery: query => router.replace({ query }),
  });
}

/**
 * Versión liviana de useJobsListing(), sin los watchers de debounce/sync a
 * la URL -- para las páginas (index.vue, categoria/[categoria].vue), que
 * solo necesitan leer el estado ya inicializado por el layout y su propia
 * paginación para armar `filters`.
 */
export function useJobsListingState() {
  const debouncedQuery = useState('listado-debounced-query', () => '');
  const source = useState('listado-source', () => '');
  const page = useState('listado-page', () => 1);

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

  return { page, filters, nextPage, prevPage };
}
