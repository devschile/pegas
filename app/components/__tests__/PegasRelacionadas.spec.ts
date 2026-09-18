import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PegasRelacionadas from '../PegasRelacionadas.vue';
import type { PegaRelacionada } from '~/types/pega';

const { trackMock, registrarMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  registrarMock: vi.fn(),
}));

mockNuxtImport('useTrackEvent', () => () => trackMock);
mockNuxtImport('useRelatedEvents', () => () => ({ registrar: registrarMock }));

function relacionada(over: Partial<PegaRelacionada> = {}): PegaRelacionada {
  return {
    id: 9,
    titulo: 'Frontend Developer',
    empleador: 'Acme',
    categoria: 'Frontend',
    ubicacion: 'Providencia',
    sueldo: null,
    tags: null,
    fecha_publicacion: '2026-08-15T15:00:00Z',
    fecha_creacion: '2026-08-15T00:00:00.000Z',
    score: 0.9,
    motivo: 'stack',
    ...over,
  };
}

let observarCb: (entradas: { isIntersecting: boolean }[]) => void;

function montar(relacionadas: PegaRelacionada[]) {
  return mount(PegasRelacionadas, { props: { pegaId: 1, relacionadas } });
}

/** NuxtLink no se resuelve a un <a> en el entorno de test: queda como <routerlink to="...">. */
function enlaces(wrapper: ReturnType<typeof montar>) {
  return wrapper.findAll('.relacionadas__enlace');
}

/** Simula que el bloque entró en pantalla. */
function entraEnPantalla() {
  observarCb([{ isIntersecting: true }]);
}

beforeEach(() => {
  trackMock.mockClear();
  registrarMock.mockClear();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: never) { observarCb = cb; }
      observe() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PegasRelacionadas', () => {
  /**
   * El caso que define el feature: sin candidatas buenas no se rellena con
   * cualquier cosa, se calla. Una pega de relleno le enseña a la gente a
   * ignorar el bloque entero.
   */
  it('no dibuja nada si no hay relacionadas', () => {
    expect(montar([]).find('section').exists()).toBe(false);
  });

  it('muestra título, empleador y categoría de cada una', () => {
    const wrapper = montar([relacionada(), relacionada({ id: 10, titulo: 'Backend Engineer', empleador: 'Ñandú' })]);

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Backend Engineer');
    expect(wrapper.text()).toContain('Ñandú');
  });

  it('enlaza a la página de la pega y no a la oferta original', () => {
    const wrapper = montar([relacionada()]);

    expect(enlaces(wrapper)[0]!.attributes('to')).toBe('/pega/9-frontend-developer-acme');
  });

  it('muestra la ubicación, o el badge de remoto cuando corresponde', () => {
    expect(montar([relacionada()]).text()).toContain('Providencia');

    const remota = montar([relacionada({ tags: 'remote' })]);
    expect(remota.text()).toContain('Remoto');
    expect(remota.text()).not.toContain('Providencia');
  });

  it('muestra el sueldo solo si la pega lo publica', () => {
    expect(montar([relacionada()]).text()).not.toContain('$');
    expect(montar([relacionada({ sueldo: '$2.500.000' })]).text()).toContain('$2.500.000');
  });

  it('muestra la etiqueta del motivo', () => {
    expect(montar([relacionada({ motivo: 'empresa' })]).text()).toContain('Misma empresa');
  });

  it('omite la etiqueta de un motivo que el front no conoce, sin mostrar el identificador', () => {
    const wrapper = montar([relacionada({ motivo: 'cohorte_v2' })]);

    expect(wrapper.find('.relacionadas__motivo').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('cohorte_v2');
  });

  it('cuenta una impresión por tarjeta recién cuando el bloque entra en pantalla', () => {
    montar([relacionada({ id: 9 }), relacionada({ id: 10, motivo: 'empresa' })]);

    expect(registrarMock).not.toHaveBeenCalled();

    entraEnPantalla();

    expect(registrarMock).toHaveBeenCalledTimes(2);
    expect(registrarMock).toHaveBeenCalledWith(1, 'impresion', expect.objectContaining({ similarId: 9, posicion: 0 }));
    expect(registrarMock).toHaveBeenCalledWith(1, 'impresion', expect.objectContaining({ similarId: 10, posicion: 1 }));
  });

  it('manda el motivo en la impresión: es la pregunta que la instrumentación existe para responder', () => {
    montar([relacionada({ motivo: 'sueldo' })]);

    entraEnPantalla();

    expect(trackMock).toHaveBeenCalledWith('relacionada_impresion', expect.objectContaining({ motivo: 'sueldo' }));
  });

  it('no cuenta la impresión dos veces si el bloque vuelve a entrar en pantalla', () => {
    montar([relacionada()]);

    entraEnPantalla();
    entraEnPantalla();

    expect(registrarMock).toHaveBeenCalledTimes(1);
  });

  it('no cuenta impresión mientras el bloque no se ve', () => {
    montar([relacionada()]);

    observarCb([{ isIntersecting: false }]);

    expect(registrarMock).not.toHaveBeenCalled();
  });

  /** El dispositivo es una dimensión del evento: si sale mal, el análisis por pantalla miente. */
  it('registra el evento como móvil cuando el viewport es chico', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    montar([relacionada()]);

    entraEnPantalla();

    expect(registrarMock).toHaveBeenCalledWith(1, 'impresion', expect.objectContaining({ dispositivo: 'movil' }));
  });

  it('cae a la fecha de ingesta cuando la pega no trae fecha de publicación', () => {
    const wrapper = montar([relacionada({ fecha_publicacion: null, fecha_creacion: '2026-07-01T15:00:00.000Z' })]);

    expect(wrapper.find('.relacionadas__fecha').text()).toBe('1 Julio 2026');
  });

  it('registra el click con su posición y su motivo', async () => {
    const wrapper = montar([relacionada({ id: 9 }), relacionada({ id: 10, motivo: 'empresa' })]);

    await enlaces(wrapper)[1]!.trigger('click');

    expect(registrarMock).toHaveBeenCalledWith(1, 'click', expect.objectContaining({ similarId: 10, posicion: 1 }));
    expect(trackMock).toHaveBeenCalledWith(
      'relacionada_click',
      expect.objectContaining({ pega_id: 1, similar_id: 10, motivo: 'empresa', posicion: 1 }),
    );
  });
});
