/** Slug URL-friendly: minúsculas, sin tildes, espacios/símbolos -> guiones. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * "123-frontend-developer-en-acme" — el id numérico manda, el resto del
 * slug es solo para lectura/SEO. Así el link nunca se rompe si el título o
 * el empleador cambian entre que se generó el link y que se visita.
 */
export function jobSlug(job: { id: number; titulo: string; empleador: string }): string {
  return `${job.id}-${slugify(`${job.titulo} ${job.empleador}`)}`;
}

/** Extrae el id numérico del inicio de un slug de ruta ("123-..." -> 123). */
export function idFromSlug(slug: string): number | null {
  const match = /^(\d+)/.exec(slug);
  return match ? Number(match[1]) : null;
}

export function categorySlug(category: string): string {
  return slugify(category);
}

/**
 * Recupera la categoría real (con tildes/mayúsculas/espacios originales) a
 * partir del slug de la ruta, comparando contra la lista de categorías
 * conocidas. null si ninguna matchea.
 */
export function findCategoryBySlug(categories: string[], slug: string): string | null {
  return categories.find(category => categorySlug(category) === slug) ?? null;
}
