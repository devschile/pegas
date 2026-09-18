// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import clickHandler from '../click.post';
import impresionHandler from '../impresion.post';

const { recordEventMock, readBodyMock } = vi.hoisted(() => ({
  recordEventMock: vi.fn(),
  readBodyMock: vi.fn(),
}));

vi.mock('../../../../../utils/relacionadas-eventos', async () => {
  const actual = await vi.importActual<typeof import('../../../../../utils/relacionadas-eventos')>(
    '../../../../../utils/relacionadas-eventos',
  );
  return { ...actual, recordEvent: recordEventMock };
});

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3');
  return { ...actual, readBody: (...a: unknown[]) => readBodyMock(...a) };
});

const evento = (id: string) => ({ context: { params: { id } } });

beforeEach(() => {
  recordEventMock.mockReset();
  readBodyMock.mockReset();
  readBodyMock.mockResolvedValue({ similarId: 9, posicion: 0, dispositivo: 'movil' });
});

describe.each([
  ['impresion', impresionHandler],
  ['click', clickHandler],
] as const)('handler (POST /api/pegas/:id/relacionadas/%s)', (tipo, handler) => {
  it('registra el evento con su tipo', async () => {
    // @ts-expect-error evento H3 mínimo
    expect(await handler(evento('7'))).toEqual({ ok: true });

    expect(recordEventMock).toHaveBeenCalledWith({
      pegaId: 7,
      similarId: 9,
      tipo,
      posicion: 0,
      dispositivo: 'movil',
    });
  });

  it('responde 400 si el id no es un entero', async () => {
    // @ts-expect-error evento H3 mínimo
    await expect(handler(evento('abc'))).rejects.toMatchObject({ statusCode: 400 });
    expect(recordEventMock).not.toHaveBeenCalled();
  });

  it('responde 400 y no registra nada si el cuerpo es inválido', async () => {
    readBodyMock.mockResolvedValueOnce({ similarId: -1, posicion: 0, dispositivo: 'movil' });

    // @ts-expect-error evento H3 mínimo
    await expect(handler(evento('7'))).rejects.toMatchObject({ statusCode: 400 });
    expect(recordEventMock).not.toHaveBeenCalled();
  });
});
