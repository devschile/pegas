import { query } from './db';
import { puntajeDuplicado, UMBRAL_DUPLICADO } from './pegas-similitud';
import type { PegaEntrada } from './pegas-validacion';
import type { Pega, PegaCandidataSimilar, PegaSimilaresResultado } from '~/types/pega';

const COLUMNAS_PEGA = `id, url, titulo, empleador, descripcion, categoria, ubicacion, sueldo, tags,
                       fecha_publicacion, fuente, fecha_creacion`;

const COLUMNAS_CANDIDATA = 'id, url, titulo, empleador, categoria, ubicacion, fuente, fecha_creacion';

/** `null` si esa URL todavía no está en la base -- el llamador decide qué hacer con cada caso. */
export async function buscarPegaPorUrl(url: string): Promise<Omit<PegaCandidataSimilar, 'score'> | null> {
  const { rows } = await query<Omit<PegaCandidataSimilar, 'score'>>(
    `SELECT ${COLUMNAS_CANDIDATA} FROM pegas WHERE url = $1`,
    [url],
  );
  return rows[0] ?? null;
}

/** Cuántas candidatas se traen de la base para rankear en Node. Más de las que se muestran, igual que `relacionadas.ts`. */
const CANDIDATAS_A_TRAER = 40;

/** Cuántas se devuelven ya ordenadas por puntaje. */
const CANDIDATAS_A_MOSTRAR = 5;

/**
 * Pegas activas que podrían ser la misma que `titulo`/`empleador`/`url`
 * describen, para avisar antes de cargar un duplicado desde el panel.
 *
 * `exacta` es la única garantía real: la `url` es UNIQUE en la base (ver
 * `dev/schema.dev.sql`), así que si ya existe, el INSERT del alta va a
 * fallar igual -- esto solo lo adelanta para no hacer llenar el formulario
 * entero primero. `similares` es una aproximación (ver `pegas-similitud.ts`):
 * nunca bloquea, solo avisa.
 */
export async function buscarPegasSimilares(
  entrada: { titulo: string; empleador: string; url: string },
): Promise<PegaSimilaresResultado> {
  const exacta = entrada.url ? await buscarPegaPorUrl(entrada.url) : null;

  if (!entrada.titulo && !entrada.empleador) {
    return { exacta, similares: [] };
  }

  // Sin filtro, cualquiera de las dos cláusulas vacías matchearía todo
  // (`empleador ILIKE '%%'` es siempre verdadero), así que una condición
  // completa se omite si su campo todavía no se llenó.
  const filtros: string[] = [];
  const valores: unknown[] = [];

  if (entrada.empleador) {
    valores.push(`%${entrada.empleador}%`);
    filtros.push(`empleador ILIKE $${valores.length}`);
  }
  if (entrada.titulo) {
    valores.push(entrada.titulo);
    filtros.push(`to_tsvector('spanish', titulo) @@ plainto_tsquery('spanish', $${valores.length})`);
  }

  valores.push(CANDIDATAS_A_TRAER);
  const { rows: candidatas } = await query<Omit<PegaCandidataSimilar, 'score'>>(
    `SELECT ${COLUMNAS_CANDIDATA}
     FROM pegas
     WHERE activo = TRUE AND (${filtros.join(' OR ')})
     ORDER BY fecha_creacion DESC
     LIMIT $${valores.length}`,
    valores,
  );

  const similares = candidatas
    .filter(c => c.id !== exacta?.id)
    .map(c => ({ ...c, score: puntajeDuplicado(entrada, c) }))
    .filter(c => c.score >= UMBRAL_DUPLICADO)
    .sort((a, b) => b.score - a.score)
    .slice(0, CANDIDATAS_A_MOSTRAR);

  return { exacta, similares };
}

/**
 * Alta manual desde el panel de admin (pegas que llegan por Slack u otro
 * canal que el pipeline automático de pegas-core no cubre -- ver README).
 * `fuente` queda fija en 'manual' para distinguirlas en listados y métricas;
 * el resto de las fuentes las pone ese pipeline, nunca esta función.
 */
export async function crearPega(entrada: PegaEntrada): Promise<Pega> {
  const { rows } = await query<Pega>(
    `INSERT INTO pegas (url, titulo, empleador, descripcion, categoria, ubicacion, sueldo, tags,
                        fecha_publicacion, fuente, activo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'manual',TRUE)
     RETURNING ${COLUMNAS_PEGA}, 0 AS likes, 0 AS dislikes, 0 AS guardados`,
    [
      entrada.url, entrada.titulo, entrada.empleador, entrada.descripcion, entrada.categoria,
      entrada.ubicacion, entrada.sueldo, entrada.tags, entrada.fecha_publicacion,
    ],
  );
  return rows[0]!;
}
