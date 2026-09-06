import { describe, expect, it } from 'vitest';
import { posicionEnListado } from '../ads';

describe('posicionEnListado', () => {
  it('es determinística: la misma página da siempre lo mismo', () => {
    for (const p of [1, 2, 7, 42]) {
      const primera = posicionEnListado(p, 25);
      for (let i = 0; i < 20; i++) expect(posicionEnListado(p, 25)).toBe(primera);
    }
  });

  it('nunca cae primera ni última', () => {
    for (let p = 1; p <= 200; p++) {
      for (const n of [4, 10, 25, 50]) {
        const pos = posicionEnListado(p, n)!;
        expect(pos).toBeGreaterThanOrEqual(1);
        expect(pos).toBeLessThanOrEqual(n - 1);
      }
    }
  });

  it('no devuelve nada si hay muy pocas cards', () => {
    for (const n of [0, 1, 2, 3]) expect(posicionEnListado(1, n)).toBeNull();
    expect(posicionEnListado(1, 4)).not.toBeNull();
  });

  it('reparte entre páginas en vez de correrse de a uno', () => {
    const seguidas = [1, 2, 3, 4, 5].map(p => posicionEnListado(p, 25));
    const consecutivas = seguidas.every((v, i) => i === 0 || v === seguidas[i - 1]! + 1);
    expect(consecutivas).toBe(false);
    // Y usa buena parte del rango disponible a lo largo de muchas páginas.
    const distintas = new Set(Array.from({ length: 100 }, (_, i) => posicionEnListado(i + 1, 25)));
    expect(distintas.size).toBeGreaterThan(10);
  });

  it('aguanta entradas raras sin explotar', () => {
    for (const [p, n] of [[NaN, 25], [1, NaN], [Infinity, 25], [1.7, 25]] as const) {
      expect(() => posicionEnListado(p, n)).not.toThrow();
    }
    expect(posicionEnListado(NaN, 25)).toBeNull();
    expect(posicionEnListado(1, NaN)).toBeNull();
  });
});
