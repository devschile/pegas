import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const { useFetchMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(() => 'fetch-result'),
}));
mockNuxtImport('useFetch', () => useFetchMock);

describe('useJobs', () => {
  it('pide /api/pegas con los filtros reactivos y una key estable', async () => {
    const { useJobs } = await import('../useJobs');
    const filters = ref({ q: 'vue', categoria: '', fuente: 'getonbrd', pagina: 1 });

    const result = useJobs(filters);

    const [url, options] = useFetchMock.mock.calls[0]!;
    expect(url).toBe('/api/pegas');
    expect(options).toMatchObject({ key: 'pegas-data', query: filters });
    expect(result).toBe('fetch-result');
  });
});
