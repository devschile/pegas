import { query } from './db';
import type { Pega } from '~/types/pega';

export type Reaction = 'like' | 'dislike';

export interface PegaState {
  reaccion: Reaction | null;
  guardada: boolean;
}

interface EstadoRow {
  reaccion: Reaction | null;
  guardada: boolean;
}

export async function getPegaState(usuarioId: number, pegaId: number): Promise<PegaState> {
  const { rows } = await query<EstadoRow>(
    'SELECT reaccion, guardada FROM pegas_estado_usuario WHERE usuario_id = $1 AND pega_id = $2',
    [usuarioId, pegaId],
  );
  return rows[0] ?? { reaccion: null, guardada: false };
}

/** Borra la fila si el estado resultante queda vacío -- ver migrations/003_reacciones.sql. */
async function saveState(usuarioId: number, pegaId: number, next: PegaState): Promise<PegaState> {
  if (!next.reaccion && !next.guardada) {
    await query('DELETE FROM pegas_estado_usuario WHERE usuario_id = $1 AND pega_id = $2', [usuarioId, pegaId]);
    return { reaccion: null, guardada: false };
  }

  await query(
    `INSERT INTO pegas_estado_usuario (usuario_id, pega_id, reaccion, guardada, fecha_actualizacion)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (usuario_id, pega_id)
     DO UPDATE SET reaccion = $3, guardada = $4, fecha_actualizacion = NOW()`,
    [usuarioId, pegaId, next.reaccion, next.guardada],
  );
  return next;
}

export async function setReaction(usuarioId: number, pegaId: number, reaccion: Reaction | null): Promise<PegaState> {
  const current = await getPegaState(usuarioId, pegaId);
  return saveState(usuarioId, pegaId, { ...current, reaccion });
}

export async function setSaved(usuarioId: number, pegaId: number, guardada: boolean): Promise<PegaState> {
  const current = await getPegaState(usuarioId, pegaId);
  return saveState(usuarioId, pegaId, { ...current, guardada });
}

/** Batch fetch para hidratar una página de listado entera en una sola query, sin N+1. */
export async function getPegaStatesFor(usuarioId: number, pegaIds: number[]): Promise<Record<number, PegaState>> {
  if (pegaIds.length === 0) return {};

  const { rows } = await query<EstadoRow & { pega_id: number }>(
    'SELECT pega_id, reaccion, guardada FROM pegas_estado_usuario WHERE usuario_id = $1 AND pega_id = ANY($2)',
    [usuarioId, pegaIds],
  );

  const states: Record<number, PegaState> = {};
  for (const row of rows) {
    states[row.pega_id] = { reaccion: row.reaccion, guardada: row.guardada };
  }
  return states;
}

export async function getMyPegas(usuarioId: number): Promise<(Pega & PegaState)[]> {
  const { rows } = await query<Pega & EstadoRow>(
    `SELECT p.id, p.url, p.titulo, p.empleador, p.descripcion, p.categoria, p.ubicacion, p.sueldo, p.tags,
            p.fecha_publicacion, p.fuente, p.fecha_creacion, e.reaccion, e.guardada
     FROM pegas_estado_usuario e
     JOIN pegas p ON p.id = e.pega_id
     WHERE e.usuario_id = $1
     ORDER BY e.fecha_actualizacion DESC`,
    [usuarioId],
  );
  return rows;
}
