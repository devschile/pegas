import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GlyphField from '../GlyphField.vue';

let observarCb: ((e: { isIntersecting: boolean }[]) => void) | null = null;
let redimensionarCb: (() => void) | null = null;
let observados = 0;
let desconectados = 0;
const reduce = { matches: false, addEventListener: vi.fn() };
/** Los callbacks encolados, para poder correrlos a mano en los tests. */
let encolados: Array<(t: number) => void> = [];

const TONOS = ['#c0', '#c1', '#c2', '#c3', '#c4'];

/**
 * El componente pinta en canvas, así que lo que se puede afirmar es lo que
 * dibujó: un contexto falso que anota cada `fillText` con el color y el peso
 * vigentes en ese momento.
 */
interface Trazo { ch: string; x: number; y: number; color: string; alpha: number }
let trazos: Trazo[] = [];
let contexto: Record<string, unknown> | null = null;

function prepararCanvas() {
  trazos = [];
  const ctx = {
    fillStyle: '',
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn((ch: string, x: number, y: number) =>
      trazos.push({ ch, x, y, color: ctx.fillStyle, alpha: ctx.globalAlpha }),
    ),
  };
  contexto = ctx;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => contexto) as never;
}

beforeEach(() => {
  observarCb = null;
  redimensionarCb = null;
  observados = 0;
  desconectados = 0;
  encolados = [];
  reduce.matches = false;
  prepararCanvas();
  vi.stubGlobal('matchMedia', vi.fn(() => reduce));
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: (t: number) => void) => encolados.push(cb)));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('devicePixelRatio', 2);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: never) { observarCb = cb; }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(cb: () => void) { redimensionarCb = cb; }
    observe() { observados++; }
    disconnect() { desconectados++; }
  });
  // happy-dom no hace layout: el tamaño de fuente y la rampa se fijan a mano.
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    fontSize: '16px',
    fontFamily: 'monospace',
    getPropertyValue: (p: string) => TONOS[Number(p.slice(-1))] ?? '',
  } as never);
});

afterEach(() => vi.unstubAllGlobals());

describe('GlyphField', () => {
  it('es decorativo: se esconde de los lectores de pantalla', () => {
    expect(mount(GlyphField).attributes('aria-hidden')).toBe('true');
  });

  it('pinta la grilla fija en el primer fotograma', () => {
    mount(GlyphField);
    // 26 + 24 + 28 + 24 + 26
    expect(trazos).toHaveLength(128);
  });

  it('cada glifo sale de la rampa de caracteres y de la de tonos', () => {
    mount(GlyphField);
    for (const t of trazos) {
      expect(t.ch).toMatch(/[‹{[(›}\])]/);
      expect(TONOS).toContain(t.color);
      expect(t.alpha).toBeGreaterThan(0);
      expect(t.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('dimensiona el lienzo por densidad de pantalla, no por CSS', () => {
    const w = mount(GlyphField);
    const c = w.element as HTMLCanvasElement;
    // 28 columnas de 16*22/34 px, al doble por el devicePixelRatio.
    expect(parseFloat(c.style.width)).toBeCloseTo(28 * 16 * (22 / 34), 1);
    expect(c.width).toBe(Math.round(28 * 16 * (22 / 34) * 2));
    expect(contexto!.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
  });

  /**
   * Expandido el campo tiene que llenar la banda: con la grilla fija quedaba
   * una franja delgada en el medio, no un fondo.
   */
  it('expandido toma las medidas de su contenedor', () => {
    const medidas = { clientWidth: 1200, clientHeight: 400 };
    for (const [k, v] of Object.entries(medidas)) {
      Object.defineProperty(HTMLElement.prototype, k, { value: v, configurable: true });
    }

    mount(GlyphField);
    const fija = trazos.length;
    trazos = [];
    mount(GlyphField, { props: { expandir: true }, attachTo: document.body });

    expect(trazos.length).toBeGreaterThan(fija);

    for (const k of Object.keys(medidas)) delete (HTMLElement.prototype as never)[k];
  });

  it('el modo espejado invierte el lado', () => {
    expect(mount(GlyphField, { props: { mirror: true } }).classes()).toContain('glyph-field--mirror');
  });

  it('no anima si la persona pidió menos movimiento', () => {
    reduce.matches = true;
    mount(GlyphField);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    // Pero el primer fotograma igual se pinta: si no, la pieza queda en blanco.
    expect(trazos.length).toBe(128);
  });

  it('deja de animar cuando sale de pantalla: un rAF invisible es batería regalada', () => {
    mount(GlyphField);
    vi.mocked(cancelAnimationFrame).mockClear();
    observarCb?.([{ isIntersecting: false }]);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('suelta el listener de resize al desmontar', () => {
    const soltar = vi.spyOn(window, 'removeEventListener');
    const w = mount(GlyphField);
    w.unmount();
    expect(soltar).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('desconecta el observador de tamaño al desmontar', () => {
    const w = mount(GlyphField, { attachTo: document.body });
    expect(observados).toBe(1);
    w.unmount();
    expect(desconectados).toBe(1);
  });

  it('sin contexto 2d no revienta: es decoración, no contenido', () => {
    contexto = null;
    expect(() => mount(GlyphField)).not.toThrow();
    expect(trazos).toHaveLength(0);
  });
});

/**
 * El calado: el campo mide la caja de cada elemento que le pasan y no dibuja
 * las celdas que quedan debajo, en vez de que el texto las tape.
 */
describe('GlyphField — recorte', () => {
  function rect(left: number, top: number, right: number, bottom: number) {
    return { left, top, right, bottom, width: right - left, height: bottom - top } as DOMRect;
  }

  /** El lienzo arranca en 0,0; el recorte se mueve alrededor. */
  function montarCon(recorte: unknown, ...cajas: DOMRect[]) {
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 400, 100));
    const objetivos = cajas.map(c => {
      const el = document.createElement('div');
      el.getBoundingClientRect = () => c;
      return el;
    });
    return mount(GlyphField, {
      props: { recorte: typeof recorte === 'function' ? recorte(objetivos) : objetivos[0] },
    });
  }

  it('no dibuja las celdas que quedan bajo el recorte', () => {
    montarCon(null, rect(-50, -50, 5000, 5000));
    expect(trazos).toHaveLength(0);
  });

  it('no toca las celdas que quedan fuera', () => {
    montarCon(null, rect(5000, 5000, 6000, 6000));
    expect(trazos).toHaveLength(128);
  });

  it('acepta varios recortes y cala todos', () => {
    montarCon(
      (o: HTMLElement[]) => [o[0], null, o[1]],
      rect(-50, -50, 60, 5000),
      rect(5000, 5000, 6000, 6000),
    );
    // La primera caja tapa la franja izquierda; la segunda no alcanza nada.
    expect(trazos.length).toBeGreaterThan(0);
    expect(trazos.length).toBeLessThan(128);
    expect(Math.min(...trazos.map(t => t.x))).toBeGreaterThan(60);
  });

  /**
   * La regresion que motivo el observador: al montar, la tipografia puede no
   * haber cargado y el bloque de texto reflow-ea despues. Midiendo una sola
   * vez el agujero quedaba corrido para siempre.
   */
  it('vuelve a medir el calado cuando el contenedor cambia de caja', () => {
    let caja = rect(5000, 5000, 6000, 6000);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 400, 100));
    const el = document.createElement('div');
    el.getBoundingClientRect = () => caja;
    mount(GlyphField, { props: { recorte: el }, attachTo: document.body });
    expect(trazos).toHaveLength(128);

    // El texto se asienta encima del campo; el observador lo tiene que notar.
    caja = rect(-50, -50, 5000, 5000);
    trazos = [];
    redimensionarCb?.();
    encolados.at(-1)?.(16);
    expect(trazos).toHaveLength(0);
  });

  it('sin recorte dibuja todo', () => {
    mount(GlyphField);
    expect(trazos).toHaveLength(128);
  });
});
