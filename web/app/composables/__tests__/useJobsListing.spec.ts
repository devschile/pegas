import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { createJobsListingStore, type JobsListingRefs } from '../useJobsListing';

const { useRouteMock, replaceMock } = vi.hoisted(() => ({
  useRouteMock: vi.fn(() => ({ query: {}, params: {} })),
  replaceMock: vi.fn(),
}));
mockNuxtImport('useRoute', () => useRouteMock);
/**
 * No se puede reemplazar useRouter por un objeto mínimo: plugins internos
 * de Nuxt (navigation-repaint, @nuxt/test-utils) llaman
 * `useRouter().afterEach(...)`/`.beforeResolve(...)` en el setup del test
 * environment, antes de que corra el test -- un mock sin esos métodos
 * rompe *cualquier* test de este archivo con un TypeError ajeno al
 * composable. `useState` en cambio se deja SIN mockear (mockearlo rompe el
 * `useState('_route', ...)` interno de Nuxt) -- el entorno "nuxt" de
 * vitest ya provee una implementación real que funciona bien acá.
 */
mockNuxtImport('useRouter', () => () => ({
  replace: replaceMock,
  afterEach: vi.fn(),
  beforeResolve: vi.fn(),
}));

function buildRefs(overrides: Partial<{ query: string; source: string; page: number }> = {}): JobsListingRefs {
  const query = ref(overrides.query ?? '');
  return {
    query,
    debouncedQuery: ref(query.value),
    source: ref(overrides.source ?? ''),
    page: ref(overrides.page ?? 1),
  };
}

describe('createJobsListingStore', () => {
  const replaceQuery = vi.fn();
  const categoriaParam = ref<string | string[] | undefined>(undefined);

  beforeEach(() => {
    vi.useFakeTimers();
    replaceQuery.mockClear();
    categoriaParam.value = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca en blanco/pagina 1 con refs vacios', () => {
    const { query, source, page, filters } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    expect(query.value).toBe('');
    expect(source.value).toBe('');
    expect(page.value).toBe(1);
    expect(filters.value).toEqual({ q: '', categoria: '', fuente: '', pagina: 1 });
  });

  it('respeta el estado inicial de los refs (deep-link)', () => {
    const { query, source, page, filters } = createJobsListingStore(
      buildRefs({ query: 'vue', source: 'getonbrd', page: 3 }),
      { categoriaParam, replaceQuery },
    );

    expect(query.value).toBe('vue');
    expect(source.value).toBe('getonbrd');
    expect(page.value).toBe(3);
    expect(filters.value).toEqual({ q: 'vue', categoria: '', fuente: 'getonbrd', pagina: 3 });
  });

  it('debouncea query 300ms antes de reflejarse en filters', async () => {
    const { query, filters } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    query.value = 'react';
    await nextTick();
    expect(filters.value.q).toBe('');

    vi.advanceTimersByTime(299);
    await nextTick();
    expect(filters.value.q).toBe('');

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(filters.value.q).toBe('react');
  });

  it('vuelve a la pagina 1 cuando cambia la busqueda (debounceada)', async () => {
    const { query, page, nextPage } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    nextPage();
    expect(page.value).toBe(2);

    query.value = 'react';
    await nextTick();
    vi.advanceTimersByTime(300);
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('vuelve a la pagina 1 cuando cambia la fuente (sin debounce)', async () => {
    const { source, page, nextPage } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    nextPage();
    expect(page.value).toBe(2);

    source.value = 'linkedin';
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('vuelve a la pagina 1 cuando cambia la categoria (navegacion de ruta)', async () => {
    const { page, nextPage } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    nextPage();
    expect(page.value).toBe(2);

    categoriaParam.value = 'frontend';
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('nextPage incrementa y prevPage no baja de 1', () => {
    const { page, nextPage, prevPage } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    prevPage();
    expect(page.value).toBe(1);

    nextPage();
    nextPage();
    expect(page.value).toBe(3);

    prevPage();
    expect(page.value).toBe(2);
  });

  it('sincroniza la query string solo con los parametros activos', async () => {
    const { source, nextPage } = createJobsListingStore(buildRefs(), { categoriaParam, replaceQuery });

    source.value = 'linkedin';
    await nextTick();
    expect(replaceQuery).toHaveBeenLastCalledWith({ fuente: 'linkedin' });

    nextPage();
    await nextTick();
    expect(replaceQuery).toHaveBeenLastCalledWith({ fuente: 'linkedin', pagina: '2' });
  });
});

/**
 * useJobsListing()/useJobsListingState() son los wrappers reales (useState
 * compartido en vez de refs planos, ver comentario en el archivo fuente) --
 * comportamiento ya cubierto arriba via createJobsListingStore con refs de
 * mentira; acá solo se verifica que el wrapper conecta useState/useRoute/
 * useRouter correctamente, no se repite toda la matriz de casos.
 */
describe('useJobsListing (wrapper real)', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useRouteMock.mockReturnValue({ query: {}, params: {} });
  });

  it('nextPage/prevPage mutan la pagina compartida', async () => {
    const { useJobsListing } = await import('../useJobsListing');
    const { page, nextPage, prevPage } = useJobsListing();

    const start = page.value;
    nextPage();
    expect(page.value).toBe(start + 1);
    prevPage();
    expect(page.value).toBe(start);
  });

  it('cambiar source sincroniza la query string', async () => {
    const { useJobsListing } = await import('../useJobsListing');
    const { source } = useJobsListing();

    source.value = 'linkedin';
    await nextTick();

    expect(replaceMock).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ fuente: 'linkedin' }) }));
  });
});

describe('useJobsListingState (wrapper real)', () => {
  it('expone page/filters/nextPage/prevPage leyendo el estado compartido', async () => {
    const { useJobsListingState } = await import('../useJobsListing');
    const { page, filters, nextPage, prevPage } = useJobsListingState();

    const start = page.value;
    nextPage();
    expect(page.value).toBe(start + 1);
    expect(filters.value.pagina).toBe(start + 1);
    prevPage();
    expect(page.value).toBe(start);
  });
});
