// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPegasDesactivadas } from '../desactivadas.get';

const queryMock = vi.fn();

vi.mock('../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('getPegasDesactivadas', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve las pegas inactivas', async () => {
    const rows = [
      { id: 1, titulo: 'X', empleador: 'Y', categoria: 'Otros', fuente: 'jobicy', fecha_actualizacion: '2026-08-19' },
    ];
    queryMock.mockResolvedValueOnce({ rows });

    expect(await getPegasDesactivadas()).toEqual(rows);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE activo = FALSE'));
  });
});
