// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyPegas, getPegaState, getPegaStatesFor, setReaction, setSaved } from '../reacciones';

const queryMock = vi.fn();

vi.mock('../db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('getPegaState', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve el estado vacío por defecto si no hay fila', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    expect(await getPegaState(1, 2)).toEqual({ reaccion: null, guardada: false });
  });

  it('devuelve la fila si existe', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ reaccion: 'like', guardada: true }] });

    expect(await getPegaState(1, 2)).toEqual({ reaccion: 'like', guardada: true });
  });
});

describe('setReaction', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('inserta/actualiza (upsert) cuando el resultado no queda vacío', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }); // getPegaState: sin fila previa
    queryMock.mockResolvedValueOnce({ rows: [] }); // el upsert en sí

    const result = await setReaction(1, 2, 'like');

    expect(result).toEqual({ reaccion: 'like', guardada: false });
    const [sql, values] = queryMock.mock.calls[1]!;
    expect(sql).toContain('ON CONFLICT (usuario_id, pega_id)');
    expect(values).toEqual([1, 2, 'like', false]);
  });

  it('borra la fila si sacar la reaccion deja el estado vacío (sin guardar)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ reaccion: 'like', guardada: false }] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await setReaction(1, 2, null);

    expect(result).toEqual({ reaccion: null, guardada: false });
    const [sql, values] = queryMock.mock.calls[1]!;
    expect(sql).toContain('DELETE FROM pegas_estado_usuario');
    expect(values).toEqual([1, 2]);
  });

  it('no borra la fila si sigue guardada aunque se saque la reaccion', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ reaccion: 'like', guardada: true }] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await setReaction(1, 2, null);

    expect(result).toEqual({ reaccion: null, guardada: true });
    expect(queryMock.mock.calls[1]![0]).toContain('ON CONFLICT');
  });
});

describe('setSaved', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('preserva la reaccion existente al cambiar guardada', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ reaccion: 'dislike', guardada: false }] });
    queryMock.mockResolvedValueOnce({ rows: [] });

    const result = await setSaved(1, 2, true);

    expect(result).toEqual({ reaccion: 'dislike', guardada: true });
  });
});

describe('getPegaStatesFor', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve un objeto vacío sin llamar a query si no hay ids', async () => {
    expect(await getPegaStatesFor(1, [])).toEqual({});
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('mapea las filas por pega_id', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { pega_id: 10, reaccion: 'like', guardada: false },
        { pega_id: 20, reaccion: null, guardada: true },
      ],
    });

    const result = await getPegaStatesFor(1, [10, 20, 30]);

    expect(result).toEqual({
      10: { reaccion: 'like', guardada: false },
      20: { reaccion: null, guardada: true },
    });
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('pega_id = ANY($2)'), [1, [10, 20, 30]]);
  });
});

describe('getMyPegas', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve las filas del join, ya ordenadas por la query', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'Dev', reaccion: 'like', guardada: true }] });

    const result = await getMyPegas(7);

    expect(result).toEqual([{ id: 1, titulo: 'Dev', reaccion: 'like', guardada: true }]);
    const [sql, values] = queryMock.mock.calls[0]!;
    expect(sql).toContain('JOIN pegas p ON p.id = e.pega_id');
    expect(values).toEqual([7]);
  });
});
