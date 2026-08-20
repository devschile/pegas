/**
 * Conteos públicos de reacciones por pega, para el pie de PegaCard.
 *
 * Se resuelven como LATERAL en la misma query que trae las pegas (en vez de
 * un endpoint aparte) para que lleguen en el mismo round-trip que los datos
 * que acompañan: un fetch separado se resolvería después de que SSR ya
 * serializó el HTML, y el conteo entraría al DOM recién en cliente
 * (hydration mismatch, además del salto visual).
 *
 * Ambos fragmentos asumen que la tabla `pegas` está aliasada como `p` en la
 * query que los usa. El alias interno es `ce` y no `e` a propósito:
 * getMyPegas ya usa `e` para el estado del propio usuario, y sombrearlo
 * haría que los FILTER contaran esa fila en vez de todas.
 */
export const CONTADORES_SELECT = 'c.likes, c.dislikes, c.guardados';

export const CONTADORES_LATERAL = `
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE ce.reaccion = 'like')::int AS likes,
         COUNT(*) FILTER (WHERE ce.reaccion = 'dislike')::int AS dislikes,
         COUNT(*) FILTER (WHERE ce.guardada)::int AS guardados
       FROM pegas_estado_usuario ce
       WHERE ce.pega_id = p.id
     ) c ON TRUE`;
