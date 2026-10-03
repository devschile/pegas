import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePegasAdmin } from '../usePegasAdmin';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
mockNuxtImport('$fetch', () => fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({});
});

describe('usePegasAdmin', () => {
  it('crear una pega va por POST a la colección', async () => {
    await usePegasAdmin().crearPega({ titulo: 'X' });
    expect(fetchMock).toHaveBeenCalledWith('/api/pegas', { method: 'POST', body: { titulo: 'X' } });
  });

  it('buscar similares va por GET con los tres campos como query', async () => {
    await usePegasAdmin().buscarSimilares({ titulo: 'Desarrollador', empleador: 'Sky', url: 'https://x.cl' });
    expect(fetchMock).toHaveBeenCalledWith('/api/pegas/similares', {
      method: 'GET',
      query: { titulo: 'Desarrollador', empleador: 'Sky', url: 'https://x.cl' },
    });
  });

  it('propaga el error para que quien llama muestre el motivo del servidor', async () => {
    fetchMock.mockRejectedValueOnce({ data: { message: 'url inválida' } });
    await expect(usePegasAdmin().crearPega({})).rejects.toMatchObject({ data: { message: 'url inválida' } });
  });
});
