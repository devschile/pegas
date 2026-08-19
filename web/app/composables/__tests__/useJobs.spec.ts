import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const { useFetchMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(() => 'fetch-result'),
}));
mockNuxtImport('useFetch', () => useFetchMock);

describe('useJobs', () => {
  it('pide /api/pegas con los filtros reactivos', async () => {
    const { useJobs } = await import('../useJobs');
    const filters = ref({ q: 'vue', categoria: '', fuente: 'getonbrd', pagina: 1 });

    const result = useJobs(filters);

    const [url, options] = useFetchMock.mock.calls[0]!;
    expect(url).toBe('/api/pegas');
    expect(options).toMatchObject({ query: filters });
    expect(result).toBe('fetch-result');
  });

  it('la key varia segun los filtros -- distinto (ej. categoria) da distinta key, evitando que index.vue y categoria/[categoria].vue compartan cache', async () => {
    const { useJobs } = await import('../useJobs');
    const filtersA = ref({ q: '', categoria: '', fuente: '', pagina: 1 });
    const filtersB = ref({ q: '', categoria: 'Frontend', fuente: '', pagina: 1 });

    useJobs(filtersA);
    useJobs(filtersB);

    const keyA = (useFetchMock.mock.calls[0]![1] as { key: () => string }).key();
    const keyB = (useFetchMock.mock.calls[1]![1] as { key: () => string }).key();
    expect(keyA).not.toBe(keyB);
  });
});
