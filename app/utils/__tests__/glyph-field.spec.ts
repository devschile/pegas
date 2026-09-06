import { describe, expect, it } from 'vitest';
import {
  ABIERTOS,
  BANDAS,
  BASE,
  CERRADOS,
  DESNIVEL,
  celda,
  construirGrilla,
  desplazamiento,
  estaCalada,
  mod,
} from '../glyph-field';

describe('mod', () => {
  it('devuelve siempre positivo, que es lo que el % de JS no hace', () => {
    expect(mod(-1, 4)).toBe(3);
    expect(mod(5, 4)).toBe(1);
  });
});

describe('construirGrilla', () => {
  it('sin medidas arma la grilla fija de cinco filas', () => {
    const g = construirGrilla(16);
    expect(g.filas).toEqual(DESNIVEL.map(d => BASE + d));
    expect(g.cols).toBe(BASE + 2);
    // 26 + 24 + 28 + 24 + 26
    expect(g.filas.reduce((a, b) => a + b)).toBe(128);
  });

  it('con medidas llena el contenedor a lo ancho y a lo alto', () => {
    const g = construirGrilla(16, 1200, 400);
    expect(g.cols).toBeGreaterThan(BASE + 2);
    expect(g.filas.length).toBeGreaterThan(DESNIVEL.length);
    expect(g.ancho).toBeGreaterThanOrEqual(1200);
    expect(g.alto).toBeGreaterThanOrEqual(400);
  });

  it('nunca baja de la grilla mínima aunque el contenedor sea diminuto', () => {
    const g = construirGrilla(16, 10, 10);
    expect(g.cols).toBe(BASE + 2);
    expect(g.filas.length).toBe(DESNIVEL.length);
  });

  it('el desnivel se repite al expandir, para que no se lea como una tabla', () => {
    const g = construirGrilla(16, 0, 400);
    const anchos = new Set(g.filas);
    expect(anchos.size).toBe(3);
  });
});

describe('desplazamiento', () => {
  it('alinea la fila corta según el lado del campo', () => {
    expect(desplazamiento(20, 30, 10, 'inicio')).toBe(0);
    expect(desplazamiento(20, 30, 10, 'fin')).toBe(100);
    expect(desplazamiento(20, 30, 10, 'centro')).toBe(50);
  });
});

describe('estaCalada', () => {
  const caja = { left: 100, top: 100, right: 200, bottom: 150 };

  it('cala lo que cae dentro', () => {
    expect(estaCalada(150, 125, [caja])).toBe(true);
  });

  it('no cala lo que queda fuera', () => {
    expect(estaCalada(300, 125, [caja])).toBe(false);
    expect(estaCalada(150, 400, [caja])).toBe(false);
  });

  it('la holgura extiende el agujero un poco más allá del texto', () => {
    expect(estaCalada(204, 125, [caja])).toBe(true);
    expect(estaCalada(210, 125, [caja])).toBe(false);
  });

  it('sin cajas no cala nada', () => {
    expect(estaCalada(150, 125, [])).toBe(false);
  });

  it('basta con una caja de varias', () => {
    expect(estaCalada(150, 125, [{ left: 0, top: 0, right: 1, bottom: 1 }, caja])).toBe(true);
  });
});

describe('celda', () => {
  it('la mitad izquierda abre y la derecha cierra', () => {
    expect(ABIERTOS).toContain(celda(0, 2, 26, 5, 0, false).ch);
    expect(CERRADOS).toContain(celda(25, 2, 26, 5, 0, false).ch);
  });

  it('espejada invierte qué lado abre', () => {
    expect(CERRADOS).toContain(celda(0, 2, 26, 5, 0, true).ch);
    expect(ABIERTOS).toContain(celda(25, 2, 26, 5, 0, true).ch);
  });

  it('la banda cae siempre dentro de la rampa', () => {
    for (let t = 0; t < 12000; t += 137) {
      for (let x = 0; x < 26; x++) {
        const v = celda(x, t % 5, 26, 5, t, false);
        expect(v.banda).toBeGreaterThanOrEqual(0);
        expect(v.banda).toBeLessThan(BANDAS.length);
        expect(v.peso).toBeGreaterThan(0);
        expect(v.peso).toBeLessThanOrEqual(1);
      }
    }
  });

  it('el haz va nítido y lo lejano se apaga: es lo que da el radar', () => {
    // En t=0 el barrido apunta a 0 rad, o sea a la derecha del centro.
    const enElHaz = celda(25, 2, 26, 5, 0, false);
    const opuesto = celda(0, 2, 26, 5, 0, false);
    expect(enElHaz.peso).toBeGreaterThan(opuesto.peso);
  });

  it('el carácter cambia con el tiempo', () => {
    const antes = celda(3, 1, 26, 5, 0, false).ch;
    const chars = new Set([0, 200, 400, 600].map(t => celda(3, 1, 26, 5, t, false).ch));
    expect(chars.size).toBeGreaterThan(1);
    expect(chars).toContain(antes);
  });
});
