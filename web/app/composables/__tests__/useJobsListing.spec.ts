import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

const { useRouteMock, replaceMock } = vi.hoisted(() => ({
  useRouteMock: vi.fn(() => ({ query: {} })),
  replaceMock: vi.fn(),
}));
mockNuxtImport('useRoute', () => useRouteMock);
/**
 * No se puede reemplazar useRouter por un objeto mínimo: plugins internos
 * de Nuxt (navigation-repaint, @nuxt/test-utils) llaman
 * `useRouter().afterEach(...)`/`.beforeResolve(...)` en el setup del test
 * environment, antes de que corra el test -- un mock sin esos métodos
 * rompe *cualquier* test de este archivo con un TypeError ajeno al
 * composable. Se mockea con los no-ops que esos plugins necesitan más
 * `replace`, que es lo único que este composable llama.
 */
mockNuxtImport('useRouter', () => () => ({
  replace: replaceMock,
  afterEach: vi.fn(),
  beforeResolve: vi.fn(),
}));

async function importUseJobsListing() {
  const { useJobsListing } = await import('../useJobsListing');
  return useJobsListing;
}

describe('useJobsListing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replaceMock.mockClear();
    useRouteMock.mockReturnValue({ query: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arranca en blanco/pagina 1 sin query string', async () => {
    const useJobsListing = await importUseJobsListing();
    const { query, source, page, filters } = useJobsListing();

    expect(query.value).toBe('');
    expect(source.value).toBe('');
    expect(page.value).toBe(1);
    expect(filters.value).toEqual({ q: '', categoria: '', fuente: '', pagina: 1 });
  });

  it('lee el estado inicial desde la query string (deep-link)', async () => {
    useRouteMock.mockReturnValue({ query: { q: 'vue', fuente: 'getonbrd', pagina: '3' } });
    const useJobsListing = await importUseJobsListing();

    const { query, source, page, filters } = useJobsListing();

    expect(query.value).toBe('vue');
    expect(source.value).toBe('getonbrd');
    expect(page.value).toBe(3);
    expect(filters.value).toEqual({ q: 'vue', categoria: '', fuente: 'getonbrd', pagina: 3 });
  });

  it('ignora un pagina invalido en la query string y cae a 1', async () => {
    useRouteMock.mockReturnValue({ query: { pagina: 'abc' } });
    const useJobsListing = await importUseJobsListing();

    expect(useJobsListing().page.value).toBe(1);
  });

  it('debouncea query 300ms antes de reflejarse en filters', async () => {
    const useJobsListing = await importUseJobsListing();
    const { query, filters } = useJobsListing();

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
    const useJobsListing = await importUseJobsListing();
    const { query, page, nextPage } = useJobsListing();

    nextPage();
    expect(page.value).toBe(2);

    query.value = 'react';
    await nextTick();
    vi.advanceTimersByTime(300);
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('vuelve a la pagina 1 cuando cambia la fuente (sin debounce)', async () => {
    const useJobsListing = await importUseJobsListing();
    const { source, page, nextPage } = useJobsListing();

    nextPage();
    expect(page.value).toBe(2);

    source.value = 'linkedin';
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('nextPage incrementa y prevPage no baja de 1', async () => {
    const useJobsListing = await importUseJobsListing();
    const { page, nextPage, prevPage } = useJobsListing();

    prevPage();
    expect(page.value).toBe(1);

    nextPage();
    nextPage();
    expect(page.value).toBe(3);

    prevPage();
    expect(page.value).toBe(2);
  });

  it('sincroniza la query string solo con los parametros activos', async () => {
    const useJobsListing = await importUseJobsListing();
    const { source, page, nextPage } = useJobsListing();

    source.value = 'linkedin';
    await nextTick();
    expect(replaceMock).toHaveBeenLastCalledWith({ query: { fuente: 'linkedin' } });

    nextPage();
    await nextTick();
    expect(replaceMock).toHaveBeenLastCalledWith({ query: { fuente: 'linkedin', pagina: '2' } });
  });
});
