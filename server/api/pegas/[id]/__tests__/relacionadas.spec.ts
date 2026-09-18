// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { RELACIONADAS_POR_PEGA } from '../relacionadas.get';

const getRelatedJobsMock = vi.fn();
vi.mock('../../../../utils/relacionadas', () => ({
  getRelatedJobs: (...a: unknown[]) => getRelatedJobsMock(...a),
}));

beforeEach(() => {
  getRelatedJobsMock.mockReset();
  getRelatedJobsMock.mockResolvedValue([]);
});

describe('handler (GET /api/pegas/:id/relacionadas)', () => {
  it('devuelve las relacionadas de la pega', async () => {
    getRelatedJobsMock.mockResolvedValueOnce([{ id: 9 }]);

    // @ts-expect-error evento H3 mínimo: getRouterParam solo lee event.context.params
    expect(await handler({ context: { params: { id: '3' } } })).toEqual([{ id: 9 }]);
  });

  it('pide exactamente las que entran en el bloque', async () => {
    // @ts-expect-error evento H3 mínimo
    await handler({ context: { params: { id: '3' } } });

    expect(getRelatedJobsMock).toHaveBeenCalledWith(3, RELACIONADAS_POR_PEGA);
  });

  it('responde 400 si el id no es un entero', async () => {
    // @ts-expect-error evento H3 mínimo
    await expect(handler({ context: { params: { id: 'abc' } } })).rejects.toMatchObject({ statusCode: 400 });
  });

  /** Una pega inexistente no tiene aristas: lista vacía, sin una consulta extra para decir lo mismo. */
  it('no comprueba que la pega exista', async () => {
    // @ts-expect-error evento H3 mínimo
    expect(await handler({ context: { params: { id: '999999' } } })).toEqual([]);
  });
});
