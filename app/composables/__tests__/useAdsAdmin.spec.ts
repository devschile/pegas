import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdsAdmin } from '../useAdsAdmin';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
mockNuxtImport('$fetch', () => fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({});
});

describe('useAdsAdmin', () => {
  it('crear un ad va por POST a la colección', async () => {
    await useAdsAdmin().crearAd({ nombre: 'X' });
    expect(fetchMock).toHaveBeenCalledWith('/api/ads', { method: 'POST', body: { nombre: 'X' } });
  });

  it('actualizar va por PATCH al recurso', async () => {
    await useAdsAdmin().actualizarAd(7, { nombre: 'X' });
    expect(fetchMock).toHaveBeenCalledWith('/api/ads/7', { method: 'PATCH', body: { nombre: 'X' } });
  });

  it('borrar va por DELETE y sin cuerpo', async () => {
    await useAdsAdmin().borrarAd(7);
    expect(fetchMock).toHaveBeenCalledWith('/api/ads/7', { method: 'DELETE' });
  });

  it('las empresas usan su propia colección', async () => {
    const api = useAdsAdmin();
    await api.crearEmpresa({ nombre: 'E', slug: 'e' });
    expect(fetchMock).toHaveBeenCalledWith('/api/empresas', { method: 'POST', body: { nombre: 'E', slug: 'e' } });

    await api.actualizarEmpresa(3, { nombre: 'E' });
    expect(fetchMock).toHaveBeenCalledWith('/api/empresas/3', { method: 'PATCH', body: { nombre: 'E' } });
  });

  it('propaga el error para que quien llama muestre el motivo del servidor', async () => {
    fetchMock.mockRejectedValueOnce({ data: { message: 'slug inválido' } });
    await expect(useAdsAdmin().crearEmpresa({})).rejects.toMatchObject({ data: { message: 'slug inválido' } });
  });
});
