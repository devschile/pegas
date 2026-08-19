<script setup lang="ts">
import { computed, watch } from 'vue';
import { findCategoryBySlug } from '~/utils/slug';
import type { PegasListado, PegasMeta } from '~/types/pega';

/**
 * Layout de index.vue y categoria/[categoria].vue -- la barra de filtros
 * (buscar/fuente/contador) y la nav de categorías viven acá, no en cada
 * página, así que NO se remontan al navegar entre esas dos páginas
 * (Nuxt solo remonta el layout cuando la página cambia de layout, no en
 * cada navegación dentro del mismo layout). Antes vivían duplicadas en
 * cada página y se remontaban en cada cambio de categoría, arrancando de
 * cero el contador animado de PegasFiltros cada vez.
 */
const route = useRoute();

const { data: meta } = await useFetch<PegasMeta>('/api/meta', { key: 'pegas-meta' });
const categories = computed(() => meta.value?.categorias ?? []);
const sources = computed(() => meta.value?.fuentes ?? []);

const { query, source, filters: baseFilters } = useJobsListing();

const track = useTrackEvent();
/** Solo el select (acción discreta), no cada tecla del buscador. */
watch(source, value => track('filtro_usado', { filtro: 'fuente', valor: value }));

/** Página específica que se está mostrando (para resaltar el badge activo en CategoriasNav). */
const activeCategory = computed(() => {
  const slugParam = Array.isArray(route.params.categoria) ? route.params.categoria[0] : route.params.categoria;
  return slugParam ? (findCategoryBySlug(categories.value, slugParam) ?? undefined) : undefined;
});

/**
 * El layout (padre) renderiza antes que la página (hijo) en un SSR de una
 * sola pasada -- si el total filtrado lo calculara la página y lo
 * "empujara" hacia acá via estado compartido, el layout ya habría
 * serializado su HTML con el valor viejo/default antes de que la página
 * llegue a correr, produciendo un hydration mismatch. Así que el layout
 * pide su propio conteo, independiente del fetch de la página (que sí
 * trae los resultados completos de la página actual) -- mismo endpoint,
 * pero solo pide 1 fila (porPagina:1) porque acá únicamente importa
 * `total`, no el listado.
 */
const countFilters = computed(() => ({
  q: baseFilters.value.q,
  categoria: activeCategory.value ?? '',
  fuente: source.value,
  pagina: 1,
  porPagina: 1,
}));
const { data: countData } = await useFetch<PegasListado>('/api/pegas', {
  key: () => `pegas-count-${JSON.stringify(countFilters.value)}`,
  query: countFilters,
});
const totalVisible = computed(() => countData.value?.total ?? 0);

function resetFilters() {
  query.value = '';
  source.value = '';
}
</script>

<template>
  <div>
    <PegasFiltros
      v-model:query="query"
      v-model:source="source"
      :sources="sources"
      :total-visible="totalVisible"
      :total-general="meta?.total ?? 0"
    />

    <CategoriasNav :categories="categories" :active="activeCategory" @reset="resetFilters" />

    <slot />
  </div>
</template>
