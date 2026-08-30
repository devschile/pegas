<script setup lang="ts">
import { IconSearchOff } from '@tabler/icons-vue';
import { computed, onMounted, watch } from 'vue';
import { findCategoryBySlug } from '~/utils/slug';
import { scrollToTop } from '~/utils/scroll';
import type { PegasMeta } from '~/types/pega';

definePageMeta({ layout: 'listado' });

const route = useRoute();
const track = useTrackEvent();

const { data: meta, error: metaError } = await useFetch<PegasMeta>('/api/meta', { key: 'pegas-meta' });

const slugParam = Array.isArray(route.params.categoria) ? route.params.categoria[0] : route.params.categoria;
const category = findCategoryBySlug(meta.value?.categorias ?? [], slugParam ?? '');

if (metaError.value) {
  throw createError({ statusCode: 500, statusMessage: 'No se pudieron cargar las pegas', fatal: true });
}
if (!category) {
  throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada', fatal: true });
}

const { page, filters: baseFilters, nextPage, prevPage } = useJobsListingState();
const filters = computed(() => ({ ...baseFilters.value, categoria: category }));
const { data, error: fetchError } = await useJobs(filters);

if (fetchError.value) {
  throw createError({ statusCode: 500, statusMessage: 'No se pudieron cargar las pegas', fatal: true });
}

const jobs = computed(() => data.value?.pegas ?? []);
const total = computed(() => data.value?.total ?? 0);
const porPagina = computed(() => data.value?.porPagina ?? 25);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / porPagina.value)));

const rangeStart = computed(() => (total.value === 0 ? 0 : (page.value - 1) * porPagina.value + 1));
const rangeEnd = computed(() => Math.min(page.value * porPagina.value, total.value));

/** `await` explícito -- ver la misma nota en index.vue: un watch no bloquea SSR. */
const { loadStates } = usePegaReactions();
await loadStates(jobs.value.map(job => job.id));
watch(jobs, value => loadStates(value.map(job => job.id)));

onMounted(() => {
  track('categoria_view', { categoria: category, total: total.value });
});

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

useSeoMeta({
  title: `Pegas de ${category}`,
  description: `Ofertas de trabajo tech de ${category} en Chile y remoto LatAm, agregadas desde varias fuentes.`,
  ogTitle: `Pegas de ${category}`,
  ogDescription: `${total.value} pegas de ${category} disponibles ahora en Pegas devsChile().`,
  twitterCard: 'summary_large_image',
});
defineOgImage('Pega', {
  title: `Pegas de ${category}`,
  subtitle: `${total.value} pegas disponibles ahora`,
});

useHead({ link: [{ rel: 'canonical', href: `https://pegas.devschile.cl/categoria/${slugParam}` }] });
</script>

<template>
  <div class="listado-categoria">
    <Transition name="fade-filtro" mode="out-in">
      <div :key="JSON.stringify(filters)">
        <p v-if="jobs.length === 0" class="listado-categoria__mensaje"><IconSearchOff aria-hidden="true" /> Ninguna pega coincide</p>

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
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.listado-categoria__mensaje {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 4rem 0;
  color: var(--text-muted, #666);
}

.fade-filtro-enter-active,
.fade-filtro-leave-active {
  transition: opacity 0.2s ease;
}

.fade-filtro-enter-from,
.fade-filtro-leave-to {
  opacity: 0;
}
</style>
