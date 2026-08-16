<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import { computed, onMounted } from 'vue';
import { PAGE_SIZE, useJobsListing } from '~/composables/useJobsListing';
import { findCategoryBySlug } from '~/utils/slug';
import { scrollToTop } from '~/utils/scroll';

const route = useRoute();
const router = useRouter();
const { data, error: fetchError } = await useJobs();
const track = useTrackEvent();

const slugParam = Array.isArray(route.params.categoria) ? route.params.categoria[0] : route.params.categoria;
const category = findCategoryBySlug(data.value?.categorias ?? [], slugParam ?? '');

if (fetchError.value) {
  throw createError({ statusCode: 500, statusMessage: 'No se pudieron cargar las pegas', fatal: true });
}
if (!category) {
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada', fatal: true });
}

const allCategories = computed(() => data.value?.categorias ?? []);
const categoryJobs = computed(() => (data.value?.pegas ?? []).filter(job => job.categoria === category));
const categorySources = computed(() => [...new Set(categoryJobs.value.map(job => job.fuente))]);

const { query, source, page, totalPages, filteredJobs, pageItems, nextPage, prevPage } =
  useJobsListing(categoryJobs);

const rangeStart = computed(() => (page.value - 1) * PAGE_SIZE + 1);
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, filteredJobs.value.length));

onMounted(() => {
  track('categoria_view', { categoria: category, total: categoryJobs.value.length });
});

function goToPreviousPage() {
  prevPage();
  scrollToTop();
}

function goToNextPage() {
  nextPage();
  scrollToTop();
}

function handleBackClick() {
  router.push('/');
}

useSeoMeta({
  title: `Pegas de ${category}`,
  description: `Ofertas de trabajo tech de ${category} en Chile y remoto LatAm, agregadas desde varias fuentes.`,
  ogTitle: `Pegas de ${category}`,
  ogDescription: `${categoryJobs.value.length} pegas de ${category} disponibles ahora en Pegas devsChile().`,
  ogImage: 'https://utfs.io/f/ZkRB8SdTOr1pVr4K8lG0bLlkFfDeNAs3GhUqpWQTYazn8jSH',
  twitterCard: 'summary_large_image',
});

useHead({ link: [{ rel: 'canonical', href: `https://pegas.devschile.cl/categoria/${slugParam}` }] });
</script>

<template>
  <div class="listado-categoria">
    <PegasFiltros
      v-model:query="query"
      v-model:source="source"
      :sources="categorySources"
      :total-visible="filteredJobs.length"
      :total-general="categoryJobs.length"
    />

    <CategoriasNav :categories="allCategories" :active="category" />

    <p v-if="filteredJobs.length === 0" class="listado-categoria__mensaje">🔍 Ninguna pega coincide</p>

    <div v-else class="pegas-grid">
      <PegaCard v-for="(job, index) in pageItems" :key="job.id" :job="job" :index="index" />
    </div>

    <PegasPaginacion
      :page="page"
      :total-pages="totalPages"
      :start="rangeStart"
      :end="rangeEnd"
      :total="filteredJobs.length"
      @prev="goToPreviousPage"
      @next="goToNextPage"
    />
  </div>
</template>

<style scoped>
.listado-categoria__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  white-space: nowrap;
}

.listado-categoria__row {
    display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
}

.listado-categoria__volver {
  flex-shrink: 0;
}

.listado-categoria__titulo {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listado-categoria__mensaje {
  text-align: center;
  padding: 4rem 0;
  color: var(--text-muted, #666);
}
</style>
