// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activarPega } from '../activar.post';

const queryMock = vi.fn();

vi.mock('../../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('activarPega', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('vuelve a marcar la pega como activa', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await activarPega(7);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SET activo = TRUE'), [7]);
  });
});
