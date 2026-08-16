import { computed, ref, watch, type Ref } from 'vue';
import type { Pega } from '~/types/pega';

export const PAGE_SIZE = 25;

/**
 * Filtrado (búsqueda + categoría + fuente) y paginación sobre una lista de
 * pegas. Portado de la lógica de js/app.js (applyFilters/renderPage) a
 * refs/computed reactivos.
 */
export function useJobsListing(jobs: Ref<Pega[]>) {
  const query = ref('');
  const category = ref('');
  const source = ref('');
  const page = ref(1);

  const filteredJobs = computed(() => {
    const normalizedQuery = query.value.toLowerCase().trim();

    return jobs.value.filter(job => {
      if (category.value && job.categoria !== category.value) return false;
      if (source.value && job.fuente !== source.value) return false;
      if (normalizedQuery) {
        const haystack = `${job.titulo} ${job.empleador} ${job.descripcion} ${job.categoria}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  });

  const totalPages = computed(() => Math.max(1, Math.ceil(filteredJobs.value.length / PAGE_SIZE)));

  const pageItems = computed(() => {
    const start = (page.value - 1) * PAGE_SIZE;
    return filteredJobs.value.slice(start, start + PAGE_SIZE);
  });

  /** Cualquier cambio de filtro vuelve a la página 1, igual que en el sitio actual. */
  watch([query, category, source], () => {
    page.value = 1;
  });

  function nextPage() {
    if (page.value < totalPages.value) page.value++;
  }

  function prevPage() {
    if (page.value > 1) page.value--;
  }

  return {
    query,
    category,
    source,
    page,
    totalPages,
    filteredJobs,
    pageItems,
    nextPage,
    prevPage,
  };
}
