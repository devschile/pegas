import { defineEventHandler } from 'h3';
import { query } from '../../utils/db';

export interface PegaDesactivada {
  id: number;
  titulo: string;
  empleador: string;
  categoria: string;
  fuente: string;
  fecha_actualizacion: string;
}

export async function getPegasDesactivadas(): Promise<PegaDesactivada[]> {
  const { rows } = await query<PegaDesactivada>(
    `SELECT id, titulo, empleador, categoria, fuente, fecha_actualizacion
     FROM pegas
     WHERE activo = FALSE
     ORDER BY fecha_actualizacion DESC
     LIMIT 200`,
  );
  return rows;
}

export default defineEventHandler(async event => {
  await requireAdmin(event);
  return getPegasDesactivadas();
});
