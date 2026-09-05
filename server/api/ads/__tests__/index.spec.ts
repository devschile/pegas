// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdsActivos, parseUbicacion, UBICACIONES } from '../index.get';

const queryMock = vi.fn();

vi.mock('../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('parseUbicacion', () => {
  it('acepta las tres ubicaciones conocidas', () => {
    for (const u of UBICACIONES) expect(parseUbicacion(u)).toBe(u);
  });

  it('descarta cualquier otra cosa en vez de pasarla a SQL', () => {
    for (const basura of ['sidebar', '', "header' OR 1=1--", 0, null, undefined, {}, ['header']]) {
      expect(parseUbicacion(basura)).toBeNull();
    }
  });
});

describe('getAdsActivos', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it('solo devuelve los activos', async () => {
    await getAdsActivos();
    expect(queryMock.mock.calls[0][0]).toMatch(/WHERE activo/);
  });

  it('no expone metadatos internos', async () => {
    await getAdsActivos();
    const sql = queryMock.mock.calls[0][0];
    for (const columna of ['nombre', 'creado_por', 'fecha_creacion', 'fecha_actualizacion']) {
      expect(sql).not.toMatch(new RegExp(`\\b${columna}\\b`));
    }
  });

  it('sin ubicación pasa null y trae todos', async () => {
    await getAdsActivos();
    expect(queryMock.mock.calls[0][1]).toEqual([null]);
  });

  it('filtra por ubicación de forma parametrizada', async () => {
    await getAdsActivos('footer');
    expect(queryMock.mock.calls[0][0]).toMatch(/\$1 = ANY \(ubicaciones\)/);
    expect(queryMock.mock.calls[0][1]).toEqual(['footer']);
  });

  it('devuelve las filas tal cual vienen', async () => {
    const rows = [
      { id: 3, tipo: 'imagen', imagen_url: 'https://x.cl/b.png', alt: 'b', html: null, link: 'https://x.cl', ubicaciones: ['header'] },
    ];
    queryMock.mockResolvedValueOnce({ rows });
    expect(await getAdsActivos()).toEqual(rows);
  });
});
