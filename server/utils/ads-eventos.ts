import { query } from './db';
import { UBICACIONES_VALIDAS, type Ubicacion, type Resultado } from './ads-validacion';

/**
 * Registro de impresiones y clicks.
 *
 * Los clicks se cuentan acá, en el servidor, y no en el analytics del
 * navegador: los bloqueadores de publicidad tumban el analytics, y si se le va
 * a cobrar a un anunciante el número tiene que aguantar una discusión. PostHog
 * va encima, para el embudo, no como fuente de verdad.
 *
 * Se guardan eventos con dimensiones y no contadores: un contador agregado no
 * se puede volver a analizar después, estas filas sí. NO se guarda IP ni user
 * agent — solo la clase de dispositivo, que la manda el cliente porque conoce
 * su viewport y eso es más fiable que adivinar por el user agent.
 */

export type TipoEvento = 'impresion' | 'click';
export type Dispositivo = 'desktop' | 'movil';

export interface EventoEntrada {
  ad_id: number;
  tipo: TipoEvento;
  ubicacion: Ubicacion;
  posicion: number | null;
  pagina: number | null;
  dispositivo: Dispositivo;
}

export function validarEvento(body: unknown, adId: number, tipo: TipoEvento): Resultado<EventoEntrada> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'cuerpo inválido' };
  const b = body as Record<string, unknown>;

  const ubicacion = b.ubicacion;
  if (typeof ubicacion !== 'string' || !(UBICACIONES_VALIDAS as readonly string[]).includes(ubicacion)) {
    return { ok: false, error: 'ubicacion inválida' };
  }

  const dispositivo = b.dispositivo;
  if (dispositivo !== 'desktop' && dispositivo !== 'movil') {
    return { ok: false, error: 'dispositivo inválido' };
  }

  // `posicion` y `pagina` solo tienen sentido en el listado; el CHECK de la
  // migración rechaza la fila si vienen en otra ubicación, así que se
  // descartan acá en vez de dejar que la base tire el error.
  const enListado = ubicacion === 'listado';
  const entero = (v: unknown) =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 32767 ? v : null;

  return {
    ok: true,
    valor: {
      ad_id: adId,
      tipo,
      ubicacion: ubicacion as Ubicacion,
      posicion: enListado ? entero(b.posicion) : null,
      pagina: enListado ? entero(b.pagina) : null,
      dispositivo,
    },
  };
}

export async function registrarEvento(e: EventoEntrada): Promise<void> {
  await query(
    `INSERT INTO ads_eventos (ad_id, tipo, ubicacion, posicion, pagina, dispositivo)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [e.ad_id, e.tipo, e.ubicacion, e.posicion, e.pagina, e.dispositivo],
  );
}

/**
 * El destino de un ad de imagen sale de la base, nunca de la query string.
 *
 * Si el endpoint de click aceptara la URL de destino como parámetro, sería un
 * redirector abierto: cualquiera podría mandar a alguien a un sitio arbitrario
 * con un link que empieza en pegas.devschile.cl y hereda su confianza.
 *
 * No filtra por `activo` a propósito: si alguien tiene la pestaña abierta y
 * hace click justo después de que la campaña terminó, es más razonable
 * llevarlo al destino que dejarlo en un 404 — y el click igual queda contado.
 */
export async function linkDelAd(id: number): Promise<string | null> {
  const { rows } = await query<{ link: string | null }>('SELECT link FROM ads WHERE id = $1', [id]);
  return rows[0]?.link ?? null;
}
