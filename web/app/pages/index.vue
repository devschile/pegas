<script setup lang="ts">
import { IconAlertTriangle, IconInboxOff, IconSearchOff } from '@tabler/icons-vue';
import { computed, watch } from 'vue';
import { scrollToTop } from '~/utils/scroll';
import type { PegasMeta } from '~/types/pega';

definePageMeta({ layout: 'listado' });

const { page, filters, nextPage, prevPage } = useJobsListingState();
const { data, error } = await useJobs(filters);
const { data: meta } = await useFetch<PegasMeta>('/api/meta', { key: 'pegas-meta' });

const jobs = computed(() => data.value?.pegas ?? []);
const total = computed(() => data.value?.total ?? 0);
const porPagina = computed(() => data.value?.porPagina ?? 25);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / porPagina.value)));

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

useSeoMeta({
  title: 'Ofertas de trabajo tech en Chile y remoto LatAm',
  description: 'Vitrina de ofertas de trabajo tech en Chile y remoto LatAm, agregadas desde LinkedIn, GetOnBoard, WorkingNomads, Jobicy e Himalayas.',
  ogTitle: 'Pegas devsChile() — Ofertas de trabajo tech',
  ogDescription: 'Vitrina de ofertas de trabajo tech en Chile y remoto LatAm, agregadas desde varias fuentes.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});
defineOgImage('Pega', {
  title: 'Ofertas de trabajo tech en Chile y remoto LatAm',
  subtitle: 'LinkedIn · GetOnBoard · WorkingNomads · Jobicy · Himalayas',
});
</script>

<template>
  <div class="listado">
    <p v-if="error" class="listado__mensaje"><IconAlertTriangle aria-hidden="true" /> Error al cargar las pegas</p>
    <p v-else-if="(meta?.total ?? 0) === 0" class="listado__mensaje"><IconInboxOff aria-hidden="true" /> No hay pegas aún, ¡Vuelve pronto!</p>

    <Transition v-else name="fade-filtro" mode="out-in">
      <div :key="JSON.stringify(filters)">
        <p v-if="jobs.length === 0" class="listado__mensaje"><IconSearchOff aria-hidden="true" /> Ninguna pega coincide</p>

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
.listado__mensaje {
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
