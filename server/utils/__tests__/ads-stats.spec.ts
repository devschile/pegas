// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularCtr, estadisticas, MUESTRA_MINIMA, parseRango, resumirEstadisticas } from '../ads-stats';

const queryMock = vi.fn();
vi.mock('../db', () => ({ query: (...a: unknown[]) => queryMock(...a) }));

const fila = (over: Record<string, unknown> = {}) => ({
  ad_id: 1,
  nombre: 'Campaña',
  empresa_nombre: 'Ñandú',
  ubicacion: 'header' as const,
  impresiones: 100,
  clicks: 3,
  ...over,
});

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [] });
});

describe('calcularCtr', () => {
  it('devuelve porcentaje con dos decimales', () => {
    expect(calcularCtr(1000, 25)).toBe(2.5);
    expect(calcularCtr(3, 1)).toBe(33.33);
  });

  it('sin impresiones no hay CTR que calcular, ni cero ni infinito', () => {
    expect(calcularCtr(0, 0)).toBeNull();
    expect(calcularCtr(0, 5)).toBeNull();
    expect(calcularCtr(-1, 1)).toBeNull();
  });

  it('cero clicks sí es un CTR de cero', () => {
    expect(calcularCtr(500, 0)).toBe(0);
  });
});

describe('resumirEstadisticas', () => {
  it('suma las ubicaciones de un mismo ad', () => {
    const [r] = resumirEstadisticas([
      fila({ ubicacion: 'header', impresiones: 100, clicks: 2 }),
      fila({ ubicacion: 'footer', impresiones: 300, clicks: 10 }),
    ]);
    expect(r!.impresiones).toBe(400);
    expect(r!.clicks).toBe(12);
    expect(r!.ctr).toBe(3);
    expect(r!.porUbicacion).toHaveLength(2);
  });

  it('marca como insuficiente la muestra que no alcanza para concluir nada', () => {
    const [r] = resumirEstadisticas([fila({ impresiones: MUESTRA_MINIMA - 1 })]);
    expect(r!.muestraSuficiente).toBe(false);
    // El CTR igual se calcula: se muestra con la advertencia al lado, no se esconde.
    expect(r!.ctr).not.toBeNull();
  });

  it('a partir del umbral la muestra sí alcanza', () => {
    const [r] = resumirEstadisticas([fila({ impresiones: MUESTRA_MINIMA })]);
    expect(r!.muestraSuficiente).toBe(true);
  });

  it('evalúa la muestra por ubicación, no solo el total', () => {
    const [r] = resumirEstadisticas([
      fila({ ubicacion: 'header', impresiones: MUESTRA_MINIMA }),
      fila({ ubicacion: 'footer', impresiones: 5 }),
    ]);
    expect(r!.muestraSuficiente).toBe(true);
    expect(r!.porUbicacion.find(u => u.ubicacion === 'footer')!.muestraSuficiente).toBe(false);
  });

  it('separa los ads y los ordena por volumen', () => {
    const r = resumirEstadisticas([
      fila({ ad_id: 1, impresiones: 10 }),
      fila({ ad_id: 2, nombre: 'Otra', impresiones: 900 }),
    ]);
    expect(r.map(x => x.ad_id)).toEqual([2, 1]);
  });

  it('sin datos devuelve una lista vacía, no una fila fantasma', () => {
    expect(resumirEstadisticas([])).toEqual([]);
  });
});

describe('parseRango', () => {
  const hoy = new Date('2026-09-30T00:00:00Z');

  it('por defecto toma los últimos 30 días', () => {
    const r = parseRango({}, hoy);
    expect(r.hasta).toBe('2026-09-30T00:00:00.000Z');
    expect(r.desde).toBe('2026-08-31T00:00:00.000Z');
  });

  it('respeta un rango explícito', () => {
    const r = parseRango({ desde: '2026-09-01', hasta: '2026-09-15' }, hoy);
    expect(r.desde).toBe('2026-09-01T00:00:00.000Z');
    expect(r.hasta).toBe('2026-09-15T00:00:00.000Z');
  });

  it('ignora fechas basura en vez de reventar', () => {
    const r = parseRango({ desde: 'ayer', hasta: {} }, hoy);
    expect(r.hasta).toBe('2026-09-30T00:00:00.000Z');
    expect(r.desde).toBe('2026-08-31T00:00:00.000Z');
  });

  it('un rango invertido vuelve al de por defecto', () => {
    const r = parseRango({ desde: '2026-09-20', hasta: '2026-09-10' }, hoy);
    expect(new Date(r.desde) < new Date(r.hasta)).toBe(true);
  });
});

describe('estadisticas', () => {
  it('agrega por ad y ubicación dentro del rango', async () => {
    await estadisticas('2026-09-01T00:00:00Z', '2026-09-30T00:00:00Z');
    const sql = String(queryMock.mock.calls[0][0]).replace(/\s+/g, ' ');
    expect(sql).toMatch(/GROUP BY e\.ad_id, a\.nombre, em\.nombre, e\.ubicacion/);
    expect(sql).toMatch(/e\.fecha >= \$1 AND e\.fecha < \$2/);
    expect(queryMock.mock.calls[0][1]).toEqual(['2026-09-01T00:00:00Z', '2026-09-30T00:00:00Z']);
  });
});
