import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';

const { useFetchMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(() => 'fetch-result'),
}));
mockNuxtImport('useFetch', () => useFetchMock);

describe('useJobs', () => {
  it('pide el data.json configurado con una key estable', async () => {
    const { useJobs } = await import('../useJobs');

    const result = useJobs();

    const [url, options] = useFetchMock.mock.calls[0]!;
    expect(url).toBe('https://pegas.devschile.cl/data/data.json');
    expect(options).toMatchObject({ key: 'pegas-data' });
    expect(result).toBe('fetch-result');
  });
});
