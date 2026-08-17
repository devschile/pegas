import { query } from '../utils/db';

export interface PegasMeta {
  total: number;
  categorias: string[];
  fuentes: string[];
  actualizado: string | null;
}

interface MetaRow {
  total: string;
  categorias: string[] | null;
  fuentes: string[] | null;
  actualizado: string | null;
}

export async function obtenerMeta(): Promise<PegasMeta> {
  const { rows } = await query<MetaRow>(
    `SELECT
       COUNT(*) AS total,
       COALESCE(array_agg(DISTINCT categoria) FILTER (WHERE categoria IS NOT NULL), '{}') AS categorias,
       COALESCE(array_agg(DISTINCT fuente), '{}') AS fuentes,
       MAX(fecha_actualizacion) AS actualizado
     FROM pegas
     WHERE activo = TRUE`,
  );
  const row = rows[0];

  return {
    total: parseInt(row?.total ?? '0', 10),
    categorias: row?.categorias ?? [],
    fuentes: row?.fuentes ?? [],
    actualizado: row?.actualizado ?? null,
  };
}

/**
 * Cacheado: lo consulta `SiteHeader.vue` en toda página (incluidas las de
 * detalle) solo para mostrar el total, así que no vale la pena una query
 * de agregación por cada request — a diferencia de `/api/pegas`, acá no
 * hay filtros por usuario que invaliden el caché.
 */
export default defineCachedEventHandler(obtenerMeta, { maxAge: 300 });
