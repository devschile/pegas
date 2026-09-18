import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRelatedEvents } from '../useRelatedEvents';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
mockNuxtImport('$fetch', () => fetchMock);

const dimensiones = { similarId: 9, posicion: 1, dispositivo: 'movil' as const };

function conBeacon(impl: () => boolean) {
  const beacon = vi.fn(impl);
  Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true, writable: true });
  return beacon;
}

function sinBeacon() {
  Object.defineProperty(navigator, 'sendBeacon', { value: undefined, configurable: true, writable: true });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'sendBeacon');
});

describe('useRelatedEvents', () => {
  it('manda la impresión por $fetch al endpoint de la pega de origen', async () => {
    sinBeacon();

    await useRelatedEvents().registrar(4, 'impresion', dimensiones);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/pegas/4/relacionadas/impresion',
      expect.objectContaining({ method: 'POST', body: dimensiones }),
    );
  });

  /**
   * El click navega en la misma pestaña, así que un fetch en vuelo puede
   * morir con el documento. Es justo el evento que no se puede perder: es el
   * numerador del CTR que después realimenta el cálculo.
   */
  it('manda el click por sendBeacon, que sobrevive a la navegación', async () => {
    const beacon = conBeacon(() => true);

    await useRelatedEvents().registrar(4, 'click', dimensiones);

    expect(beacon).toHaveBeenCalledWith('/api/pegas/4/relacionadas/click', expect.any(Blob));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cae a $fetch si el navegador rechaza encolar el beacon', async () => {
    conBeacon(() => false);

    await useRelatedEvents().registrar(4, 'click', dimensiones);

    expect(fetchMock).toHaveBeenCalledWith('/api/pegas/4/relacionadas/click', expect.objectContaining({ method: 'POST' }));
  });

  it('cae a $fetch si sendBeacon lanza', async () => {
    conBeacon(() => { throw new Error('sin cuota'); });

    await useRelatedEvents().registrar(4, 'click', dimensiones);

    expect(fetchMock).toHaveBeenCalled();
  });

  it('cae a $fetch si el navegador no tiene sendBeacon', async () => {
    sinBeacon();

    await useRelatedEvents().registrar(4, 'click', dimensiones);

    expect(fetchMock).toHaveBeenCalled();
  });

  it('no lanza si el envío falla: perder una métrica no puede romper la página', async () => {
    sinBeacon();
    fetchMock.mockRejectedValueOnce(new Error('red caída'));

    await expect(useRelatedEvents().registrar(4, 'impresion', dimensiones)).resolves.toBeUndefined();
  });
});
