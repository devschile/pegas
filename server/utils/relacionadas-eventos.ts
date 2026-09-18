import { query } from './db';
import type { Resultado } from './ads-validacion';

/**
 * Impresiones y clicks del bloque de pegas relacionadas.
 *
 * Existen para cerrar el ciclo: pegas-core calcula el grafo, estas filas
 * dicen qué recomendaciones la gente efectivamente miró y siguió, y ese
 * resultado vuelve a entrar en el cálculo. Sin esto el scoring es una
 * heurística que nadie puede refutar.
 *
 * Se guardan eventos con dimensiones y no contadores, por el mismo motivo que
 * en `ads-eventos.ts`: un contador agregado no se puede volver a analizar,
 * estas filas sí. No se guarda IP ni user agent — solo la clase de
 * dispositivo, que la manda el cliente porque conoce su viewport.
 *
 * ## Contrato con pegas-core
 *
 * `relacionadas_eventos(id, pega_id, similar_id, tipo, posicion, motivo,
 * score, dispositivo, fecha)`, con índice por `(similar_id, fecha DESC)` y
 * por `(motivo, tipo)` — la pregunta que esta tabla existe para responder es
 * "qué motivo se gana los clicks", y se consulta por ahí.
 */

/**
 * Sin `export`: `server/utils/` es un espacio de auto-imports compartido en
 * Nitro, y `ads-eventos.ts` ya publica estos dos nombres. Exportarlos acá los
 * tapaba ("Duplicated imports") y dejaba a quien escribiera `TipoEvento` en un
 * archivo de ads apuntando, en silencio, al tipo de este módulo.
 */
type TipoEvento = 'impresion' | 'click';
type Dispositivo = 'desktop' | 'movil';

export interface EventoRelacionada {
  pegaId: number;
  similarId: number;
  tipo: TipoEvento;
  posicion: number;
  dispositivo: Dispositivo;
}

/** Tope holgado sobre las 2 ranuras que hoy renderiza el bloque. */
const MAX_POSITION = 9;

export function validateEvent(body: unknown, pegaId: number, tipo: TipoEvento): Resultado<EventoRelacionada> {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'cuerpo inválido' };
  const raw = body as Record<string, unknown>;

  const similarId = raw.similarId;
  if (typeof similarId !== 'number' || !Number.isSafeInteger(similarId) || similarId <= 0) {
    return { ok: false, error: 'similarId inválido' };
  }
  if (similarId === pegaId) return { ok: false, error: 'similarId no puede ser la misma pega' };

  const posicion = raw.posicion;
  if (typeof posicion !== 'number' || !Number.isInteger(posicion) || posicion < 0 || posicion > MAX_POSITION) {
    return { ok: false, error: 'posicion inválida' };
  }

  const dispositivo = raw.dispositivo;
  if (dispositivo !== 'desktop' && dispositivo !== 'movil') {
    return { ok: false, error: 'dispositivo inválido' };
  }

  return { ok: true, valor: { pegaId, similarId, tipo, posicion, dispositivo } };
}

/**
 * `motivo` y `score` NO los manda el cliente: se copian de la arista real
 * dentro del mismo INSERT.
 *
 * Es el mismo criterio que en `linkDelAd` — lo que la base ya sabe no se
 * acepta por parámetro. Acá pesa más todavía, porque estas filas vuelven a
 * alimentar el cálculo de recomendaciones: dejar que el navegador declare con
 * qué motivo entró un aviso sería dejar que cualquiera envenene el scoring
 * con un `curl`.
 *
 * El `SELECT` de la fuente hace además de validación: si el par no existe en
 * el grafo, no se inserta nada y el evento se descarta en silencio. Eso
 * incluye un caso legítimo y poco frecuente —que el recálculo nocturno haya
 * borrado la arista entre la impresión y el click— que se prefiere perder
 * antes que registrar con datos inventados.
 */
export async function recordEvent(e: EventoRelacionada): Promise<void> {
  await query(
    `INSERT INTO relacionadas_eventos (pega_id, similar_id, tipo, posicion, motivo, score, dispositivo)
     SELECT s.pega_id, s.similar_id, $3, $4, s.motivo, s.score, $5
     FROM pegas_similares s
     WHERE s.pega_id = $1 AND s.similar_id = $2`,
    [e.pegaId, e.similarId, e.tipo, e.posicion, e.dispositivo],
  );
}
