// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { puntajeDuplicado, similitud, UMBRAL_DUPLICADO } from '../pegas-similitud';

describe('similitud', () => {
  it('es 1 para el mismo texto', () => {
    expect(similitud('Desarrollador Backend', 'Desarrollador Backend')).toBe(1);
  });

  it('ignora mayúsculas, tildes y signos de puntuación', () => {
    expect(similitud('Programador/a Júnior', 'programador a junior')).toBe(1);
  });

  it('es 0 entre textos sin nada en común', () => {
    expect(similitud('xyz', 'qwk')).toBe(0);
  });

  it('es simétrica', () => {
    expect(similitud('Desarrollador Backend', 'Backend Developer')).toBe(
      similitud('Backend Developer', 'Desarrollador Backend'),
    );
  });

  it('un texto vacío no rompe nada y da 0', () => {
    expect(similitud('', 'algo')).toBe(0);
    expect(similitud('algo', '')).toBe(0);
    expect(similitud('', '')).toBe(0);
  });

  it('reconoce una variación menor (mismo cargo, "Senior" agregado) como muy similar', () => {
    expect(similitud('Desarrollador Backend', 'Desarrollador Backend Senior')).toBeGreaterThan(UMBRAL_DUPLICADO);
  });
});

describe('puntajeDuplicado', () => {
  it('un cargo igual en empleadores distintos no es duplicado', () => {
    const score = puntajeDuplicado(
      { titulo: 'Desarrollador Backend', empleador: 'Sky Airline' },
      { titulo: 'Desarrollador Backend', empleador: 'Banco de Chile' },
    );
    expect(score).toBeLessThan(UMBRAL_DUPLICADO);
  });

  it('título y empleador casi idénticos sí es duplicado, aunque difieran en un detalle', () => {
    const score = puntajeDuplicado(
      { titulo: 'Desarrollador Backend', empleador: 'Sky Airline' },
      { titulo: 'Desarrollador Backend', empleador: 'Sky Airline SpA' },
    );
    expect(score).toBeGreaterThanOrEqual(UMBRAL_DUPLICADO);
  });

  it('sin empleador en alguno de los dos lados, puntúa solo por título', () => {
    const score = puntajeDuplicado(
      { titulo: 'Desarrollador Backend', empleador: null },
      { titulo: 'Desarrollador Backend', empleador: 'Sky Airline' },
    );
    expect(score).toBe(1);
  });

  it('mismo título y empleador es duplicado claro', () => {
    const score = puntajeDuplicado(
      { titulo: 'Desarrollador Backend', empleador: 'Sky Airline' },
      { titulo: 'Desarrollador Backend', empleador: 'Sky Airline' },
    );
    expect(score).toBeGreaterThanOrEqual(UMBRAL_DUPLICADO);
  });

  it('un empleador null se trata como cadena vacía, sin reventar', () => {
    expect(() =>
      puntajeDuplicado({ titulo: 'Desarrollador', empleador: null }, { titulo: 'Desarrollador', empleador: null }),
    ).not.toThrow();
  });
});
