// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { listarPegas, parseListarPegasQuery } from '../index.get';

const queryMock = vi.fn();

vi.mock('../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('parseListarPegasQuery', () => {
  it('usa los valores por defecto sin query params', () => {
    expect(parseListarPegasQuery({})).toEqual({ q: '', categoria: '', fuente: '', pagina: 1, porPagina: 25 });
  });

  it('recorta espacios en q, categoria y fuente', () => {
    const result = parseListarPegasQuery({ q: '  vue  ', categoria: ' frontend ', fuente: ' getonboard ' });
    expect(result).toMatchObject({ q: 'vue', categoria: 'frontend', fuente: 'getonboard' });
  });

  it('clampea porPagina a 50 como máximo', () => {
    expect(parseListarPegasQuery({ porPagina: '999' }).porPagina).toBe(50);
  });

  it('clampea porPagina a 1 como mínimo', () => {
    expect(parseListarPegasQuery({ porPagina: '-5' }).porPagina).toBe(1);
  });

  it('clampea pagina a 1 como mínimo', () => {
    expect(parseListarPegasQuery({ pagina: '-3' }).pagina).toBe(1);
  });

  it('ignora valores no numéricos y cae al default', () => {
    expect(parseListarPegasQuery({ pagina: 'abc', porPagina: 'xyz' })).toMatchObject({ pagina: 1, porPagina: 25 });
  });
});

describe('listarPegas', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('cuenta y pagina sin filtros', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: '2' }] });
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

    const result = await listarPegas({ q: '', categoria: '', fuente: '', pagina: 1, porPagina: 25 });

    expect(result.total).toBe(2);
    expect(result.pegas).toHaveLength(2);
    expect(queryMock).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*) FROM pegas WHERE activo = TRUE', []);
    const [sql, values] = queryMock.mock.calls[1];
    expect(sql).toContain('LIMIT $1 OFFSET $2');
    expect(values).toEqual([25, 0]);
  });

  it('agrega categoria, fuente y busqueda como filtros parametrizados', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: '0' }] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    await listarPegas({ q: 'react', categoria: 'frontend', fuente: 'getonboard', pagina: 2, porPagina: 10 });

    const [countSql, countValues] = queryMock.mock.calls[0];
    expect(countSql).toContain('categoria = $1');
    expect(countSql).toContain('fuente = $2');
    expect(countSql).toContain('ILIKE $3');
    expect(countValues).toEqual(['frontend', 'getonboard', '%react%']);

    const [, listValues] = queryMock.mock.calls[1];
    expect(listValues).toEqual(['frontend', 'getonboard', '%react%', 10, 10]);
  });

  it('devuelve total 0 si COUNT no trae filas', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await listarPegas({ q: '', categoria: '', fuente: '', pagina: 1, porPagina: 25 });

    expect(result.total).toBe(0);
  });
});

describe('handler (GET /api/pegas)', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('lee los filtros desde la query string real (event.path) y delega en listarPegas', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ count: '1' }] });
    queryMock.mockResolvedValueOnce({ rows: [{ id: 5 }] });

    // @ts-expect-error evento H3 mínimo: getQuery solo lee event.path
    const result = await handler({ path: '/api/pegas?categoria=frontend&pagina=1' });

    expect(result).toEqual({ total: 1, pagina: 1, porPagina: 25, pegas: [{ id: 5 }] });
    expect(queryMock.mock.calls[0][0]).toContain('categoria = $1');
  });
});
