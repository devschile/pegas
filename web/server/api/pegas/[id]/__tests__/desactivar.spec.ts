// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { desactivarPega } from '../desactivar.post';

const queryMock = vi.fn();

vi.mock('../../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

describe('desactivarPega', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('marca la pega como inactiva', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await desactivarPega(7);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SET activo = FALSE'), [7]);
  });
});
