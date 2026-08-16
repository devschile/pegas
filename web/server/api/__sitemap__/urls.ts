import { defineSitemapEventHandler } from '#imports';
import { categorySlug, jobSlug } from '~/utils/slug';
import type { PegasData } from '~/types/pega';

/**
 * URLs dinámicas para el sitemap: páginas de pega individual y de categoría
 * no son rutas físicas rastreables, así que se generan acá a partir del
 * mismo data.json que consume el resto de la app (ver `sitemap.sources` en
 * nuxt.config.ts).
 */
export default defineSitemapEventHandler(async () => {
  const config = useRuntimeConfig();
  const data = await $fetch<PegasData>(config.public.dataJsonUrl);

  const jobUrls = data.pegas.map(job => ({
    loc: `/pega/${jobSlug(job)}`,
    lastmod: job.fecha_publicacion || job.fecha_creacion,
  }));

  const categoryUrls = data.categorias.map(category => ({
    loc: `/categoria/${categorySlug(category)}`,
  }));

  return [...jobUrls, ...categoryUrls];
});
