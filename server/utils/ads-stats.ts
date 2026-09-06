import { query } from './db';
import type { Ubicacion } from './ads-validacion';

/**
 * Agregados de impresiones y clicks para el panel.
 *
 * A propósito **no hay un algoritmo que recomiende mover un ad**. Con el
 * volumen de hoy las diferencias de CTR entre ubicaciones son ruido: hacen
 * falta cientos de clicks por variante para que signifiquen algo, y un
 * recomendador sobre cincuenta impresiones produce basura que parece
 * confiable, que es peor que no tener nada.
 *
 * Lo que sí se hace es mostrar los números con su tamaño de muestra al lado, y
 * marcar cuáles todavía no alcanzan para sacar conclusiones. Cuando haya
 * volumen, el análisis se diseña mirando estos datos.
 */

/**
 * Debajo de esto un CTR no dice nada. Con 100 impresiones, la diferencia entre
 * 1% y 3% son dos clicks: cualquier conclusión sería una casualidad.
 */
export const MUESTRA_MINIMA = 1000;

export interface FilaEvento {
  ad_id: number;
  nombre: string;
  empresa_nombre: string;
  ubicacion: Ubicacion;
  impresiones: number;
  clicks: number;
}

export interface ResumenAd {
  ad_id: number;
  nombre: string;
  empresa_nombre: string;
  impresiones: number;
  clicks: number;
  ctr: number | null;
  muestraSuficiente: boolean;
  porUbicacion: Array<{
    ubicacion: Ubicacion;
    impresiones: number;
    clicks: number;
    ctr: number | null;
    muestraSuficiente: boolean;
  }>;
}

/** CTR en porcentaje, o `null` si no hubo ninguna impresión que dividir. */
export function calcularCtr(impresiones: number, clicks: number): number | null {
  if (impresiones <= 0) return null;
  return Math.round((clicks / impresiones) * 10000) / 100;
}

export function resumirEstadisticas(filas: FilaEvento[]): ResumenAd[] {
  const porAd = new Map<number, ResumenAd>();

  for (const f of filas) {
    let r = porAd.get(f.ad_id);
    if (!r) {
      r = {
        ad_id: f.ad_id,
        nombre: f.nombre,
        empresa_nombre: f.empresa_nombre,
        impresiones: 0,
        clicks: 0,
        ctr: null,
        muestraSuficiente: false,
        porUbicacion: [],
      };
      porAd.set(f.ad_id, r);
    }
    r.impresiones += f.impresiones;
    r.clicks += f.clicks;
    r.porUbicacion.push({
      ubicacion: f.ubicacion,
      impresiones: f.impresiones,
      clicks: f.clicks,
      ctr: calcularCtr(f.impresiones, f.clicks),
      muestraSuficiente: f.impresiones >= MUESTRA_MINIMA,
    });
  }

  for (const r of porAd.values()) {
    r.ctr = calcularCtr(r.impresiones, r.clicks);
    r.muestraSuficiente = r.impresiones >= MUESTRA_MINIMA;
    r.porUbicacion.sort((a, b) => b.impresiones - a.impresiones);
  }

  return [...porAd.values()].sort((a, b) => b.impresiones - a.impresiones);
}

/**
 * Rango de fechas del informe. Llega por query string, así que se valida: sin
 * tope, un rango absurdo hace que la consulta recorra la tabla entera.
 */
export function parseRango(raw: Record<string, unknown>, hoy = new Date()): { desde: string; hasta: string } {
  const fecha = (v: unknown): Date | null => {
    if (typeof v !== 'string' || v.trim() === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const hasta = fecha(raw.hasta) ?? hoy;
  const porDefecto = new Date(hasta.getTime() - 30 * 24 * 60 * 60 * 1000);
  let desde = fecha(raw.desde) ?? porDefecto;

  // Un rango invertido es un error de quien llama, no una intención.
  if (desde > hasta) desde = porDefecto;

  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

export async function estadisticas(desde: string, hasta: string): Promise<FilaEvento[]> {
  const { rows } = await query<FilaEvento>(
    `SELECT e.ad_id,
            a.nombre,
            em.nombre AS empresa_nombre,
            e.ubicacion,
            COUNT(*) FILTER (WHERE e.tipo = 'impresion')::int AS impresiones,
            COUNT(*) FILTER (WHERE e.tipo = 'click')::int     AS clicks
     FROM ads_eventos e
     JOIN ads a ON a.id = e.ad_id
     JOIN empresas em ON em.id = a.empresa_id
     WHERE e.fecha >= $1 AND e.fecha < $2
     GROUP BY e.ad_id, a.nombre, em.nombre, e.ubicacion`,
    [desde, hasta],
  );
  return rows;
}
