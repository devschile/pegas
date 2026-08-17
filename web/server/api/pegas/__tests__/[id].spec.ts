// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { obtenerPega, parsePegaId } from '../[id].get';

const queryMock = vi.fn();

vi.mock('../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('parsePegaId', () => {
  it('acepta un entero positivo como string', () => {
    expect(parsePegaId('42')).toBe(42);
  });

  it('rechaza undefined', () => {
    expect(parsePegaId(undefined)).toBeNull();
  });

  it('rechaza no-numérico', () => {
    expect(parsePegaId('abc')).toBeNull();
  });

  it('rechaza cero y negativos', () => {
    expect(parsePegaId('0')).toBeNull();
    expect(parsePegaId('-1')).toBeNull();
  });

  it('rechaza decimales', () => {
    expect(parsePegaId('1.5')).toBeNull();
  });
});

describe('obtenerPega', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve la pega si existe y está activa', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 7, titulo: 'Dev' }] });

    const pega = await obtenerPega(7);

    expect(pega).toEqual({ id: 7, titulo: 'Dev' });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1 AND activo = TRUE'), [7]);
  });

  it('devuelve null si no hay filas', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    expect(await obtenerPega(999)).toBeNull();
  });
});

describe('handler (GET /api/pegas/:id)', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve la pega para un id válido', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 3 }] });

    // @ts-expect-error evento H3 mínimo: getRouterParam solo lee event.context.params
    const result = await handler({ context: { params: { id: '3' } } });

    expect(result).toEqual({ id: 3 });
  });

  it('responde 400 si el id no es un entero', async () => {
    // @ts-expect-error evento H3 mínimo
    await expect(handler({ context: { params: { id: 'abc' } } })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('responde 404 si la pega no existe', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    // @ts-expect-error evento H3 mínimo
    await expect(handler({ context: { params: { id: '999' } } })).rejects.toMatchObject({ statusCode: 404 });
  });
});
