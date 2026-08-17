<script setup lang="ts">
import { computed, watch } from 'vue';
import { scrollToTop } from '~/utils/scroll';
import type { PegasMeta } from '~/types/pega';

const { query, source, page, filters, nextPage, prevPage } = useJobsListing();
const { data, error } = await useJobs(filters);
const { data: meta } = await useFetch<PegasMeta>('/api/meta', { key: 'pegas-meta' });
const track = useTrackEvent();

const jobs = computed(() => data.value?.pegas ?? []);
const total = computed(() => data.value?.total ?? 0);
const porPagina = computed(() => data.value?.porPagina ?? 25);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / porPagina.value)));
const categories = computed(() => meta.value?.categorias ?? []);
const sources = computed(() => meta.value?.fuentes ?? []);

const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * porPagina.value + 1));
const rangeEnd = computed(() => Math.min(page.value * porPagina.value, total.value));

/**
 * `await` explícito, no solo el watch de abajo: un `watch` dispara
 * `loadStates` sin que SSR lo espere -- el HTML ya se serializa antes de
 * que la respuesta llegue, así que los botones quedaban siempre inactivos
 * en el render inicial. El watch sigue haciendo falta para cuando `jobs`
 * cambia client-side (paginación/filtros).
 */
const { loadStates } = usePegaReactions();
await loadStates(jobs.value.map(job => job.id));
watch(jobs, value => loadStates(value.map(job => job.id)));

function goToPreviousPage() {
  if (page.value > 1) {
    prevPage();
    scrollToTop();
  }
}

function goToNextPage() {
  if (page.value < totalPages.value) {
    nextPage();
    scrollToTop();
  }
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
    <p v-else-if="(meta?.total ?? 0) === 0" class="listado__mensaje">📭 No hay pegas aún, ¡Vuelve pronto!</p>

    <template v-else>
      <PegasFiltros
        v-model:query="query"
        v-model:source="source"
        :sources="sources"
        :total-visible="total"
        :total-general="meta?.total ?? 0"
      />

      <CategoriasNav :categories="categories" @reset="resetFilters" />

      <p v-if="jobs.length === 0" class="listado__mensaje">🔍 Ninguna pega coincide</p>

      <div v-else class="pegas-grid">
        <PegaCard v-for="(job, index) in jobs" :key="job.id" :job="job" :index="index" />
      </div>

      <PegasPaginacion
        :page="page"
        :total-pages="totalPages"
        :start="rangeStart"
        :end="rangeEnd"
        :total="total"
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
