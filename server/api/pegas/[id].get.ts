import { createError, defineEventHandler, getRouterParam } from 'h3';
import { query } from '../../utils/db';
import { CONTADORES_LATERAL, CONTADORES_SELECT } from '../../utils/contadores';
import type { Pega } from '~/types/pega';

/** `null` para cualquier id que no sea un entero positivo, incluido no-numérico. */
export function parseJobId(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function getJob(id: number): Promise<Pega | null> {
  const { rows } = await query<Pega>(
    `SELECT p.id, p.url, p.titulo, p.empleador, p.descripcion, p.categoria, p.ubicacion, p.sueldo, p.tags,
            p.fecha_publicacion, p.fuente, p.fecha_creacion, ${CONTADORES_SELECT}
     FROM pegas p${CONTADORES_LATERAL}
     WHERE p.id = $1 AND p.activo = TRUE`,
    [id],
  );
  return rows[0] ?? null;
}

export default defineEventHandler(async event => {
  const id = parseJobId(getRouterParam(event, 'id'));
  if (id === null) {
    throw createError({ statusCode: 400, message: 'id inválido' });
  }

  const job = await getJob(id);
  if (!job) {
    throw createError({ statusCode: 404, message: 'Pega no encontrada' });
  }

  return job;
});
