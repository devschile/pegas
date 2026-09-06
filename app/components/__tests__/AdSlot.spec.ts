import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import AdSlot from '../AdSlot.vue';

const registrarMock = vi.fn();
mockNuxtImport('useAdEventos', () => () => ({ registrar: registrarMock }));

const adImagen = {
  id: 4,
  formato: 'imagen' as const,
  imagen_desktop_url: 'https://cdn.ejemplo.invalid/d.png',
  imagen_movil_url: 'https://cdn.ejemplo.invalid/m.png',
  alt: 'Ñandú contrata',
  html: null,
  alto_desktop: null,
  alto_movil: null,
  link: 'https://ejemplo.invalid/oferta',
  empresa_nombre: 'Ñandú Software',
  es_casa: false,
};

const adHtml = {
  ...adImagen,
  id: 3,
  formato: 'html' as const,
  imagen_desktop_url: null,
  imagen_movil_url: null,
  alt: null,
  html: '<div>pieza</div>',
  alto_desktop: 56,
  link: null,
  empresa_nombre: 'Panguipulli Labs',
};

const montar = (props: Record<string, unknown>) =>
  mount(AdSlot, { props: { ubicacion: 'header', ...props } as never });

describe('AdSlot', () => {
  it('no renderiza nada si la ubicación no tiene ad', () => {
    expect(montar({ ad: null }).html()).toBe('<!--v-if-->');
  });

  it('un ad de imagen sale con las dos fuentes y su alt', () => {
    const w = montar({ ad: adImagen });
    expect(w.find('source').attributes('srcset')).toBe(adImagen.imagen_movil_url);
    expect(w.find('img').attributes('src')).toBe(adImagen.imagen_desktop_url);
    expect(w.find('img').attributes('alt')).toBe('Ñandú contrata');
  });

  it('el click de una imagen pasa por nuestro endpoint, no por el destino directo', () => {
    const href = montar({ ad: adImagen }).find('a').attributes('href')!;
    expect(href).toMatch(/^\/api\/ads\/4\/click\?/);
    expect(href).not.toContain('ejemplo.invalid');
    expect(href).toContain('ubicacion=header');
  });

  it('el anchor va con rel sponsored y noopener', () => {
    const rel = montar({ ad: adImagen }).find('a').attributes('rel')!;
    expect(rel).toContain('sponsored');
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });

  it('el ad del listado lleva posición y página al endpoint, para poder atribuir el CTR', () => {
    const href = montar({ ad: adImagen, ubicacion: 'listado', posicion: 7, pagina: 2 })
      .find('a')
      .attributes('href')!;
    expect(href).toContain('posicion=7');
    expect(href).toContain('pagina=2');
  });

  it('un ad html va en un iframe con sandbox y sin allow-same-origin', () => {
    const marco = montar({ ad: adHtml }).find('iframe');
    const sandbox = marco.attributes('sandbox')!;
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
    expect(marco.attributes('srcdoc')).toContain('Content-Security-Policy');
    expect(marco.attributes('srcdoc')).toContain('pegas-ad');
  });

  it('reserva el alto declarado para no provocar layout shift', () => {
    expect(montar({ ad: adHtml }).find('iframe').attributes('style')).toContain('height: 56px');
  });

  it('declara que es publicidad, con el nombre del anunciante', () => {
    expect(montar({ ad: adImagen }).text()).toContain('Publicidad · Ñandú Software');
  });

  it('un espacio propio se rotula como disponible, sin hacerse pasar por vendido', () => {
    expect(montar({ ad: { ...adImagen, es_casa: true } }).text()).toContain('Espacio disponible');
  });

  it('el contenedor se anuncia como publicidad para lectores de pantalla', () => {
    expect(montar({ ad: adImagen }).find('aside').attributes('aria-label')).toBe('Publicidad');
  });
});

describe('AdSlot — mensajes del iframe', () => {
  it('ignora un mensaje que no viene del contentWindow de su propio iframe', async () => {
    const w = montar({ ad: adHtml });
    const antes = w.find('iframe').attributes('style');

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { fuente: 'pegas-ad', id: 3, tipo: 'alto', alto: 300 },
        source: window as unknown as MessageEventSource,
      }),
    );
    await w.vm.$nextTick();

    expect(w.find('iframe').attributes('style')).toBe(antes);
  });

  it('ignora un mensaje de otro emisor de la página', async () => {
    const w = montar({ ad: adHtml });
    const marco = w.find('iframe').element as HTMLIFrameElement;
    vi.spyOn(marco, 'contentWindow', 'get').mockReturnValue(window as never);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: { fuente: 'otra-cosa', id: 3, tipo: 'alto', alto: 300 },
        source: window as unknown as MessageEventSource,
      }),
    );
    await w.vm.$nextTick();

    expect(w.find('iframe').attributes('style')).toContain('56px');
  });
});

/**
 * Los observers y el postMessage se prueban a mano: son el camino donde vive
 * la validación de protocolo, que es lo que impide que un `javascript:` salido
 * del iframe termine en un window.open.
 */
describe('AdSlot — impresión y clicks del iframe', () => {
  let observarCb: ((e: { isIntersecting: boolean }[]) => void) | null = null;
  let openMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observarCb = null;
    registrarMock.mockClear();
    openMock = vi.fn();
    vi.spyOn(window, 'open').mockImplementation(openMock as never);
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

  /** Deja el iframe del wrapper como emisor válido de postMessage. */
  function comoEmisor(w: ReturnType<typeof montar>) {
    const marco = w.find('iframe').element as HTMLIFrameElement;
    const ventana = { postMessage: vi.fn() } as unknown as Window;
    vi.spyOn(marco, 'contentWindow', 'get').mockReturnValue(ventana);
    return ventana;
  }

  function mandar(w: ReturnType<typeof montar>, ventana: Window, data: unknown) {
    window.dispatchEvent(new MessageEvent('message', { data, source: ventana as unknown as MessageEventSource }));
    return w.vm.$nextTick();
  }

  it('cuenta la impresión recién cuando el ad entra en pantalla', async () => {
    montar({ ad: adImagen });
    expect(registrarMock).not.toHaveBeenCalled();

    observarCb?.([{ isIntersecting: false }]);
    expect(registrarMock).not.toHaveBeenCalled();

    observarCb?.([{ isIntersecting: true }]);
    expect(registrarMock).toHaveBeenCalledWith(4, 'impresion', expect.objectContaining({ ubicacion: 'header' }));
  });

  it('no cuenta la misma impresión dos veces', async () => {
    montar({ ad: adImagen });
    observarCb?.([{ isIntersecting: true }]);
    observarCb?.([{ isIntersecting: true }]);
    expect(registrarMock).toHaveBeenCalledTimes(1);
  });

  it('aplica el alto que reporta el iframe', async () => {
    const w = montar({ ad: adHtml });
    const ventana = comoEmisor(w);
    await mandar(w, ventana, { fuente: 'pegas-ad', id: 3, tipo: 'alto', alto: 120 });
    expect(w.find('iframe').attributes('style')).toContain('120px');
  });

  it('descarta un alto absurdo, que empujaría el listado fuera de la pantalla', async () => {
    const w = montar({ ad: adHtml });
    const ventana = comoEmisor(w);
    await mandar(w, ventana, { fuente: 'pegas-ad', id: 3, tipo: 'alto', alto: 99999 });
    expect(w.find('iframe').attributes('style')).toContain('56px');
  });

  it('un click del iframe se cuenta y abre el destino', async () => {
    const w = montar({ ad: adHtml });
    const ventana = comoEmisor(w);
    await mandar(w, ventana, { fuente: 'pegas-ad', id: 3, tipo: 'click', href: 'https://ejemplo.invalid/x' });

    expect(registrarMock).toHaveBeenCalledWith(3, 'click', expect.objectContaining({ ubicacion: 'header' }));
    expect(openMock).toHaveBeenCalledWith('https://ejemplo.invalid/x', '_blank', 'noopener,noreferrer');
  });

  it('NO abre un destino con protocolo peligroso, aunque venga del iframe', async () => {
    const w = montar({ ad: adHtml });
    const ventana = comoEmisor(w);
    for (const href of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'no-es-url']) {
      await mandar(w, ventana, { fuente: 'pegas-ad', id: 3, tipo: 'click', href });
    }
    expect(openMock).not.toHaveBeenCalled();
  });

  it('ignora un mensaje que dice ser de otro ad', async () => {
    const w = montar({ ad: adHtml });
    const ventana = comoEmisor(w);
    await mandar(w, ventana, { fuente: 'pegas-ad', id: 999, tipo: 'click', href: 'https://ejemplo.invalid/x' });
    expect(openMock).not.toHaveBeenCalled();
  });

  it('le manda el tema al iframe cuando carga, sin recargarlo', async () => {
    const w = montar({ ad: adHtml });
    const ventana = comoEmisor(w);
    await w.find('iframe').trigger('load');
    expect(ventana.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ fuente: 'pegas-host' }),
      '*',
    );
  });
});
