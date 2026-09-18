// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { elegirVisibles, getRelatedJobs, MIN_SCORE } from '../relacionadas';
import type { PegaRelacionada } from '~/types/pega';

const queryMock = vi.fn();
vi.mock('../db', () => ({ query: (...a: unknown[]) => queryMock(...a) }));

function arista(over: Partial<PegaRelacionada> = {}): PegaRelacionada {
  return {
    id: 2,
    titulo: 'Frontend Developer',
    empleador: 'Acme',
    categoria: 'Frontend',
    ubicacion: 'Chile',
    sueldo: null,
    tags: null,
    fecha_publicacion: null,
    fecha_creacion: '2026-01-01T00:00:00.000Z',
    score: 0.9,
    motivo: 'stack',
    ...over,
  };
}

beforeEach(() => {
  queryMock.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('getRelatedJobs', () => {
  it('respeta el orden que trajo la consulta, sin reordenar', async () => {
    const filas = [arista({ id: 5, score: 0.9 }), arista({ id: 9, score: 0.8 })];
    queryMock.mockResolvedValueOnce({ rows: filas });

    expect((await getRelatedJobs(1, 2)).map(p => p.id)).toEqual([5, 9]);
  });

  it('descarta las que quedan bajo el umbral', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [arista({ id: 5, score: 0.9 }), arista({ id: 9, score: MIN_SCORE - 0.01 })],
    });

    expect((await getRelatedJobs(1, 2)).map(p => p.id)).toEqual([5]);
  });

  it('acepta una que empata justo con el umbral', async () => {
    queryMock.mockResolvedValueOnce({ rows: [arista({ score: MIN_SCORE })] });

    expect(await getRelatedJobs(1, 2)).toHaveLength(1);
  });

  it('corta en el límite pedido aunque vengan más', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [arista({ id: 1 }), arista({ id: 2 }), arista({ id: 3 })],
    });

    expect(await getRelatedJobs(1, 2)).toHaveLength(2);
  });

  /**
   * El margen es lo que hace que el bloque sobreviva a que venzan las vecinas:
   * si se pidieran solo las que se muestran, una oferta cerrada dejaría el
   * bloque a medias aunque en el grafo quedaran candidatas de sobra.
   */
  it('pide más candidatas de las que va a mostrar', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await getRelatedJobs(1, 2);

    expect(queryMock.mock.calls[0][1]).toEqual([1, 10]);
  });

  it('descarta las pegas desactivadas en la consulta, no en memoria', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    await getRelatedJobs(1, 2);

    expect(String(queryMock.mock.calls[0][0])).toMatch(/p\.activo = TRUE/);
  });

  it('devuelve vacío si pegas_similares todavía no existe, en vez de tumbar la página', async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('relation does not exist'), { code: '42P01' }));

    expect(await getRelatedJobs(1, 2)).toEqual([]);
  });

  it('deja subir cualquier otro error de base', async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('conexión caída'), { code: '08006' }));

    await expect(getRelatedJobs(1, 2)).rejects.toThrow('conexión caída');
  });
});

describe('elegirVisibles', () => {
  const pool = (scores: number[]) => scores.map((score, i) => arista({ id: i + 1, score }));

  it('devuelve todo si no hay más candidatas que espacio', () => {
    expect(elegirVisibles(pool([0.9, 0.8]), 2, 0)).toHaveLength(2);
  });

  /**
   * El bucle que esto rompe: mostrar siempre las dos mejores encierra a la
   * gente en un triángulo de tres avisos mientras las otras vecinas guardadas
   * no se usan nunca.
   */
  it('no muestra siempre el mismo par al cambiar el día', () => {
    const candidatas = pool([0.9, 0.88, 0.86, 0.84, 0.82]);
    const vistos = new Set<string>();
    for (let dia = 0; dia < 30; dia++) {
      vistos.add(elegirVisibles(candidatas, 2, 7 + dia).map(c => c.id).join('-'));
    }
    expect(vistos.size).toBeGreaterThan(1);
  });

  /** Determinístico: la misma semilla da el mismo par, o el CTR no se puede atribuir. */
  it('con la misma semilla devuelve siempre lo mismo', () => {
    const candidatas = pool([0.9, 0.88, 0.86, 0.84, 0.82]);
    const primera = elegirVisibles(candidatas, 2, 42).map(c => c.id);
    for (let i = 0; i < 5; i++) {
      expect(elegirVisibles(candidatas, 2, 42).map(c => c.id)).toEqual(primera);
    }
  });

  /**
   * Rotar no puede significar empeorar: una candidata muy por debajo de la
   * mejor no entra al sorteo aunque haya pasado el umbral.
   */
  it('deja fuera del sorteo a las que no son comparables con la mejor', () => {
    const candidatas = pool([0.9, 0.88, 0.40]);
    for (let semilla = 0; semilla < 40; semilla++) {
      expect(elegirVisibles(candidatas, 2, semilla).map(c => c.id)).not.toContain(3);
    }
  });

  it('cae a las mejores cuando solo dos son comparables', () => {
    const candidatas = pool([0.9, 0.88, 0.5, 0.45]);
    expect(elegirVisibles(candidatas, 2, 123).map(c => c.id)).toEqual([1, 2]);
  });

  it('nunca devuelve repetidas', () => {
    const candidatas = pool([0.9, 0.88, 0.86, 0.84, 0.82]);
    for (let semilla = 0; semilla < 40; semilla++) {
      const ids = elegirVisibles(candidatas, 2, semilla).map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
