import { query } from './db';
import type { PegaRelacionada } from '~/types/pega';

/**
 * Lectura del grafo de pegas similares.
 *
 * **El cálculo no vive acá.** Qué aviso se le ofrece a alguien justo después
 * de leer otro es una decisión de producto: mueve la navegación, se mide y se
 * ajusta. La heurística, sus pesos y las señales de comportamiento que la
 * alimentan viven en `pegas-core`, que es privado; este archivo solo lee lo
 * que ese proceso dejó escrito. Ver AGENTS.md — y vale recordar que el
 * historial de un repositorio público no se borra, así que esto no es algo
 * que se pueda escribir acá "por ahora" y mover después.
 *
 * ## Contrato con pegas-core
 *
 * Tabla `pegas_similares(pega_id, similar_id, score, motivo, calculado_en)`,
 * PK `(pega_id, similar_id)`, índice por `(pega_id, score DESC)`.
 *
 * - **`score` llega normalizado a 0..1.** Sin una escala acordada, el umbral
 *   de este archivo no significaría nada y no se podría calibrar.
 * - **Se guardan ~10 vecinas por pega, no 2.** Una oferta se desactiva cuando
 *   vence, y guardar exactamente las que se muestran deja el bloque vacío a
 *   los pocos días. Acá se piden de más y se descartan las inactivas.
 * - **El orden y la diversidad los decide core.** Se toman las primeras que
 *   pasan el umbral, sin reordenar ni filtrar por empresa: si dos avisos del
 *   mismo empleador no deben salir juntos, eso se resuelve al escribir la
 *   fila. Reordenar acá sería volver a meter el criterio en el repo público.
 * - **`motivo` es un conjunto abierto.** El front etiqueta los que conoce y
 *   muestra sin etiqueta los que no (`app/utils/relacionadas.ts`), para que
 *   core pueda introducir uno nuevo sin romper producción.
 */

/**
 * Bajo esto no se muestra nada. Es la traducción de "que no sea al azar": una
 * pega de relleno no es neutra, le enseña a la gente que el bloque no vale la
 * pena mirarlo, y se lleva puesta la confianza en las que sí eran buenas.
 *
 * Es un umbral de seguridad, no el criterio principal: core ya decide qué
 * merece escribirse. Queda acá para poder subirlo sin un despliegue de core
 * si el bloque resulta ruidoso, y hay que recalibrarlo la primera vez que se
 * vean scores reales — 0.35 es una apuesta sobre una escala que todavía no
 * observamos.
 */
export const MIN_SCORE = 0.35;

/**
 * Se piden más de las que se muestran porque `activo` se evalúa acá: pedir
 * exactamente 2 devolvería 1 en cuanto una de las dos venciera, aunque en la
 * tabla hubiera ocho candidatas más.
 */
const CANDIDATES_TO_FETCH = 10;

/** `undefined_table` de Postgres. */
const UNDEFINED_TABLE = '42P01';

let missingTableWarned = false;

/**
 * Las relacionadas de una pega, ya filtradas por vigencia y umbral.
 *
 * Devuelve `[]` —y no un error— si `pegas_similares` todavía no existe: la
 * crea pegas-core, y mientras tanto un `pnpm dev` recién clonado tiene que
 * poder abrir la página de detalle igual. Solo se traga ese código de error
 * concreto; cualquier otro problema de base sigue subiendo, porque una
 * consulta que falla por otra razón es un bug que hay que ver.
 */
export async function getRelatedJobs(pegaId: number, limit: number): Promise<PegaRelacionada[]> {
  let edges: PegaRelacionada[];

  try {
    const { rows } = await query<PegaRelacionada>(
      `SELECT p.id, p.titulo, p.empleador, p.categoria, p.ubicacion, p.sueldo, p.tags,
              p.fecha_publicacion, p.fecha_creacion, s.score, s.motivo
       FROM pegas_similares s
       JOIN pegas p ON p.id = s.similar_id
       WHERE s.pega_id = $1 AND p.activo = TRUE
       ORDER BY s.score DESC, p.id
       LIMIT $2`,
      [pegaId, CANDIDATES_TO_FETCH],
    );
    edges = rows;
  } catch (err) {
    if ((err as { code?: string }).code !== UNDEFINED_TABLE) throw err;
    if (!missingTableWarned) {
      missingTableWarned = true;
      console.warn('[relacionadas] falta la tabla pegas_similares (la crea pegas-core); el bloque queda vacío');
    }
    return [];
  }

  return edges.filter(edge => edge.score >= MIN_SCORE).slice(0, limit);
}
