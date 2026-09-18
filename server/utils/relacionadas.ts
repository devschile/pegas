import { query } from './db';
import { mezclar } from '~/utils/hash';
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
 * Qué tan por debajo de la mejor candidata puede estar una para entrar igual
 * al sorteo. Con 0.75, una que puntúa un cuarto menos que la mejor sigue
 * siendo comparable; una que puntúa la mitad, no.
 *
 * El límite es lo que evita que rotar sea empeorar: se varía entre candidatas
 * de calidad parecida, nunca metiendo una mala para tener variedad.
 */
const BANDA_DE_CALIDAD = 0.75;

/** Tope del sorteo, para que no se vuelva impredecible de más. */
const POOL_MAX = 5;

/** Día actual en días desde la época. Cambia el sorteo una vez al día. */
const diaDeHoy = () => Math.floor(Date.now() / 86_400_000);

/**
 * Cuáles de las buenas se muestran hoy.
 *
 * Mostrar siempre las dos mejores encierra a la gente en un triángulo: si A
 * recomienda B y C, y B recomienda A y C, se rebota entre tres avisos mientras
 * las otras ocho vecinas guardadas no se usan nunca. Rotar abre el recorrido.
 *
 * NO es aleatorio por request, a propósito, y es el mismo criterio que la
 * posición del ad en el listado (ver `app/utils/ads.ts`): si el par cambiara
 * en cada recarga no se podría atribuir un click a una arista concreta, que es
 * justo lo que `relacionadas_eventos` existe para medir. Cambia una vez al
 * día: estable mientras alguien navega, distinto la próxima visita.
 */
export function elegirVisibles(
  candidatas: PegaRelacionada[],
  limite: number,
  semilla: number,
): PegaRelacionada[] {
  if (candidatas.length <= limite) return candidatas;

  const mejor = candidatas[0]!.score;
  const pool = candidatas
    .filter(c => c.score >= mejor * BANDA_DE_CALIDAD)
    .slice(0, POOL_MAX);

  if (pool.length <= limite) return candidatas.slice(0, limite);

  const desde = mezclar(semilla) % pool.length;
  return Array.from({ length: limite }, (_, i) => pool[(desde + i) % pool.length]!);
}

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

  const buenas = edges.filter(edge => edge.score >= MIN_SCORE);
  return elegirVisibles(buenas, limit, pegaId + diaDeHoy());
}
