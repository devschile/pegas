import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GlyphField from '../GlyphField.vue';

let observarCb: ((e: { isIntersecting: boolean }[]) => void) | null = null;
const reduce = { matches: false, addEventListener: vi.fn() };
/** Los callbacks encolados, para poder correrlos a mano en los tests. */
let encolados: Array<(t: number) => void> = [];

beforeEach(() => {
  observarCb = null;
  encolados = [];
  reduce.matches = false;
  vi.stubGlobal('matchMedia', vi.fn(() => reduce));
  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: (t: number) => void) => encolados.push(cb)));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: never) { observarCb = cb; }
    observe() {}
    disconnect() {}
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('GlyphField', () => {
  it('es decorativo: se esconde de los lectores de pantalla', () => {
    expect(mount(GlyphField).attributes('aria-hidden')).toBe('true');
  });

  it('construye la grilla de celdas al montar', () => {
    const w = mount(GlyphField);
    expect(w.findAll('.glyph-field__row')).toHaveLength(5);
    // 26 + 24 + 28 + 24 + 26
    expect(w.findAll('.glyph-field__cell')).toHaveLength(128);
  });

  it('pinta un glifo y una banda de color en cada celda', () => {
    const celda = mount(GlyphField).find('.glyph-field__cell');
    expect(celda.text()).toMatch(/[‹{[(›}\])]/);
    expect(Number(celda.attributes('data-banda'))).toBeGreaterThanOrEqual(0);
    expect(Number(celda.attributes('data-banda'))).toBeLessThanOrEqual(4);
  });

  /**
   * Expandido el campo tiene que llenar la banda: con las cinco filas fijas
   * quedaba una franja delgada en el medio, no un fondo.
   */
  it('expandido calcula filas y columnas desde su contenedor', () => {
    // El entorno de test no hace layout, asi que clientWidth/clientHeight son 0
    // para todo el mundo. Se fijan en el prototipo y se sueltan al salir.
    const medidas = { clientWidth: 1200, clientHeight: 400 };
    for (const [k, v] of Object.entries(medidas)) {
      Object.defineProperty(HTMLElement.prototype, k, { value: v, configurable: true });
    }

    const normal = mount(GlyphField).findAll('.glyph-field__cell').length;
    const ancho = mount(GlyphField, { props: { expandir: true }, attachTo: document.body });

    expect(ancho.findAll('.glyph-field__row').length).toBeGreaterThan(5);
    expect(ancho.findAll('.glyph-field__cell').length).toBeGreaterThan(normal);
    expect(ancho.classes()).toContain('glyph-field--expandir');

    for (const k of Object.keys(medidas)) delete (HTMLElement.prototype as never)[k];
  });

  it('el modo espejado invierte el lado', () => {
    expect(mount(GlyphField, { props: { mirror: true } }).classes()).toContain('glyph-field--mirror');
  });

  it('no anima si la persona pidió menos movimiento', () => {
    reduce.matches = true;
    mount(GlyphField);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('deja de animar cuando sale de pantalla: un rAF invisible es batería regalada', () => {
    mount(GlyphField);
    vi.mocked(cancelAnimationFrame).mockClear();
    observarCb?.([{ isIntersecting: false }]);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('limpia el observer al desmontar', () => {
    const w = mount(GlyphField);
    expect(() => w.unmount()).not.toThrow();
  });
});

/**
 * El calado: el campo mide la caja del elemento que le pasan y deja en blanco
 * las celdas que quedan debajo, en vez de que el texto las tape.
 */
describe('GlyphField — recorte', () => {
  function rect(left: number, top: number, right: number, bottom: number) {
    return { left, top, right, bottom, width: right - left, height: bottom - top, x: left, y: top, toJSON: () => ({}) } as DOMRect;
  }

  /** Todas las celdas caen en 0,0-10,10; el recorte se mueve alrededor. */
  function montarCon(cajaRecorte: DOMRect) {
    const recorte = document.createElement('div');
    recorte.getBoundingClientRect = () => cajaRecorte;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 10, 10));
    const w = mount(GlyphField, { props: { recorte } });
    // El primer encolado es la medición del recorte; el segundo, el bucle.
    encolados[0]?.(0);
    encolados[1]?.(16);
    return w;
  }

  it('deja en blanco las celdas que quedan bajo el recorte', () => {
    const w = montarCon(rect(-50, -50, 200, 200));
    const enBlanco = w.findAll('.glyph-field__cell').filter(c => c.text() === '');
    expect(enBlanco.length).toBe(128);
  });

  it('no toca las celdas que quedan fuera', () => {
    const w = montarCon(rect(5000, 5000, 6000, 6000));
    const conGlifo = w.findAll('.glyph-field__cell').filter(c => c.text() !== '');
    expect(conGlifo.length).toBe(128);
  });

  it('acepta varios recortes y cala todos', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    a.getBoundingClientRect = () => rect(-50, -50, 5, 200);
    b.getBoundingClientRect = () => rect(5000, 5000, 6000, 6000);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 10, 10));
    const w = mount(GlyphField, { props: { recorte: [a, null, b] } });
    encolados[0]?.(0);
    encolados[1]?.(16);
    // Todas las celdas comparten caja en el test, asi que la primera las cala.
    expect(w.findAll('.glyph-field__cell').filter(c => c.text() === '').length).toBe(128);
  });

  it('sin recorte no cala nada', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 10, 10));
    const w = mount(GlyphField);
    encolados[0]?.(16);
    expect(w.findAll('.glyph-field__cell').filter(c => c.text() !== '').length).toBe(128);
  });
});
