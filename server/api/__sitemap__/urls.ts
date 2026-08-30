import { defineSitemapEventHandler } from '#imports';
import { categorySlug, jobSlug } from '~/utils/slug';
import { query } from '../../utils/db';

interface SitemapPegaRow {
  id: number;
  titulo: string;
  empleador: string;
  categoria: string;
  fecha_publicacion: string | null;
  fecha_creacion: string;
}

/**
 * URLs dinámicas para el sitemap: páginas de pega individual y de categoría
 * no son rutas físicas rastreables, así que se generan acá consultando
 * directamente la base (sitemap necesita el listado completo, no paginado
 * como `/api/pegas` -- ver `sitemap.sources` en nuxt.config.ts).
 */
export default defineSitemapEventHandler(async () => {
  const { rows } = await query<SitemapPegaRow>(
    `SELECT id, titulo, empleador, categoria, fecha_publicacion, fecha_creacion
     FROM pegas
     WHERE activo = TRUE`,
  );

  const jobUrls = rows.map(job => ({
    loc: `/pega/${jobSlug(job)}`,
    lastmod: job.fecha_publicacion || job.fecha_creacion,
  }));

  const categorias = [...new Set(rows.map(row => row.categoria).filter(Boolean))];
  const categoryUrls = categorias.map(category => ({
    loc: `/categoria/${categorySlug(category)}`,
  }));

  return [...jobUrls, ...categoryUrls];
});
