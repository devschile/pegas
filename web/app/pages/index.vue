<script setup lang="ts">
import { computed, watch } from 'vue';
import { PAGE_SIZE, useJobsListing } from '~/composables/useJobsListing';
import { scrollToTop } from '~/utils/scroll';

const { data, error } = await useJobs();
const track = useTrackEvent();

const jobs = computed(() => data.value?.pegas ?? []);
const categories = computed(() => data.value?.categorias ?? []);
const sources = computed(() => data.value?.fuentes ?? []);

const { query, source, page, totalPages, filteredJobs, pageItems, nextPage, prevPage } = useJobsListing(jobs);

const rangeStart = computed(() => (page.value - 1) * PAGE_SIZE + 1);
const rangeEnd = computed(() => Math.min(page.value * PAGE_SIZE, filteredJobs.value.length));

function goToPreviousPage() {
  prevPage();
  scrollToTop();
}

function goToNextPage() {
  nextPage();
  scrollToTop();
}

function resetFilters() {
  query.value = '';
  source.value = '';
}

/** Solo el select (acción discreta), no cada tecla del buscador. */
watch(source, value => track('filtro_usado', { filtro: 'fuente', valor: value }));

useSeoMeta({
  title: 'Ofertas de trabajo tech en Chile y remoto LatAm',
  description: 'Vitrina de ofertas de trabajo tech en Chile y remoto LatAm, agregadas desde LinkedIn, GetOnBoard, WorkingNomads, Jobicy e Himalayas.',
  ogTitle: 'Pegas devsChile() — Ofertas de trabajo tech',
  ogDescription: 'Vitrina de ofertas de trabajo tech en Chile y remoto LatAm, agregadas desde varias fuentes.',
  ogImage: 'https://utfs.io/f/ZkRB8SdTOr1pVr4K8lG0bLlkFfDeNAs3GhUqpWQTYazn8jSH',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});
</script>

<template>
  <div class="listado">
    <p v-if="error" class="listado__mensaje">⚠ Error al cargar las pegas</p>
    <p v-else-if="jobs.length === 0" class="listado__mensaje">📭 No hay pegas aún, ¡Vuelve pronto!</p>

    <template v-else>
      <PegasFiltros
        v-model:query="query"
        v-model:source="source"
        :sources="sources"
        :total-visible="filteredJobs.length"
        :total-general="jobs.length"
      />

      <CategoriasNav :categories="categories" @reset="resetFilters" />

      <p v-if="filteredJobs.length === 0" class="listado__mensaje">🔍 Ninguna pega coincide</p>

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
    </template>
  </div>
</template>

<style scoped>
.listado__mensaje {
  text-align: center;
  padding: 4rem 0;
  color: var(--text-muted, #666);
}
</style>
