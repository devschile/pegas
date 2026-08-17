// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

/**
 * `defineCachedEventHandler` es un auto-import de Nitro que depende de
 * módulos virtuales (#nitro-internal-virtual/*) generados solo dentro de un
 * servidor Nitro real -- no se puede importar ni mockear vía mockNuxtImport
 * en un test unitario. Se shimea como identidad para poder importar el
 * módulo y ejercitar `obtenerMeta`; el wrapping de caché en sí queda sin
 * cobertura de test, igual que `defineSitemapEventHandler` en
 * `server/api/__sitemap__/urls.ts`.
 */
(globalThis as Record<string, unknown>).defineCachedEventHandler = (fn: unknown) => fn;

const { obtenerMeta } = await import('../meta.get');

describe('obtenerMeta', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('mapea la fila agregada a PegasMeta', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ total: '3', categorias: ['frontend', 'backend'], fuentes: ['linkedin'], actualizado: '2026-08-01T00:00:00.000Z' }],
    });

    expect(await obtenerMeta()).toEqual({
      total: 3,
      categorias: ['frontend', 'backend'],
      fuentes: ['linkedin'],
      actualizado: '2026-08-01T00:00:00.000Z',
    });
  });

  it('devuelve valores vacíos si no hay filas (tabla vacía)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    expect(await obtenerMeta()).toEqual({ total: 0, categorias: [], fuentes: [], actualizado: null });
  });
});
