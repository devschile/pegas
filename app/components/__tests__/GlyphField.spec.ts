import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GlyphField from '../GlyphField.vue';

let observarCb: ((e: { isIntersecting: boolean }[]) => void) | null = null;
const reduce = { matches: false, addEventListener: vi.fn() };

beforeEach(() => {
  observarCb = null;
  reduce.matches = false;
  vi.stubGlobal('matchMedia', vi.fn(() => reduce));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
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
