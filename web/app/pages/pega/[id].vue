<script setup lang="ts">
import { ChBadge, ChButton, ChCard } from '@devschile/chucao/vue';
import { computed, onMounted } from 'vue';
import { formatDate, sourceLabel } from '~/utils/pegas';
import { categorySlug, idFromSlug, jobSlug } from '~/utils/slug';
import type { Pega } from '~/types/pega';

const route = useRoute();
const track = useTrackEvent();

const idParam = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
const id = idFromSlug(idParam ?? '');

if (id === null) {
  throw createError({ statusCode: 404, statusMessage: 'Pega no encontrada', fatal: true });
}

const { data: fetchedJob, error: fetchError } = await useFetch<Pega>(`/api/pegas/${id}`, { key: `pega-${id}` });

if (fetchError.value) {
  const statusCode = fetchError.value.statusCode === 404 ? 404 : 500;
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? 'Pega no encontrada' : 'No se pudieron cargar las pegas',
    fatal: true,
  });
}
if (!fetchedJob.value) {
  throw createError({ statusCode: 404, statusMessage: 'Pega no encontrada', fatal: true });
}

const job = fetchedJob.value;

const publishedDate = computed(() => formatDate(job.fecha_publicacion || job.fecha_creacion));
const isRemote = computed(() => Boolean(job.tags?.includes('remote')));
const canonicalUrl = computed(() => `https://pegas.devschile.cl/pega/${jobSlug(job)}`);

useSeoMeta({
  title: `${job.titulo} en ${job.empleador}`,
  description: `${job.titulo} en ${job.empleador}, ${job.ubicacion}. Publicada en ${sourceLabel(job.fuente)}.`,
  ogTitle: `${job.titulo} en ${job.empleador}`,
  ogDescription: `${job.categoria} · ${job.ubicacion}${job.sueldo ? ' · ' + job.sueldo : ''}`,
  ogImage: 'https://utfs.io/f/ZkRB8SdTOr1pVr4K8lG0bLlkFfDeNAs3GhUqpWQTYazn8jSH',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});
useHead({ link: [{ rel: 'canonical', href: canonicalUrl.value }] });

/**
 * JobPosting de Schema.org para Google Jobs / rich results. "descripcion" en
 * nuestros datos es un string corto autogenerado (título + ubicación), no el
 * texto completo del aviso — ninguna fuente actual lo captura todavía.
 * baseSalary se omite a propósito: "sueldo" es un string libre
 * ("USD 2000 - 3000 /mes"), no hay forma de mapearlo a un baseSalary
 * numérico válido sin arriesgar markup inválido.
 */
useSchemaOrg([
  {
    '@type': 'JobPosting',
    title: job.titulo,
    description: job.descripcion || `${job.titulo} en ${job.empleador}`,
    datePosted: job.fecha_publicacion || job.fecha_creacion,
    hiringOrganization: { '@type': 'Organization', name: job.empleador },
    identifier: { '@type': 'PropertyValue', name: 'Pegas devsChile', value: String(job.id) },
    url: canonicalUrl.value,
    ...(isRemote.value
      ? {
          jobLocationType: 'TELECOMMUTE',
          applicantLocationRequirements: { '@type': 'Country', name: job.ubicacion },
        }
      : {
          jobLocation: {
            '@type': 'Place',
            address: { '@type': 'PostalAddress', addressCountry: 'CL', addressLocality: job.ubicacion },
          },
        }),
  },
]);

onMounted(() => {
  track('pega_view_detail', { pega_id: job.id, categoria: job.categoria, fuente: job.fuente });
});

function handleApplyClick() {
  track('pega_click_apply', { pega_id: job.id, categoria: job.categoria, fuente: job.fuente, empleador: job.empleador });
  window.open(job.url, '_blank', 'noopener,noreferrer');
}

const router = useRouter();

function handleBackClick() {
  router.push('/');
}
</script>

<template>
  <article class="pega-detalle">
    <ChButton class="pega-detalle__volver" variant="secondary" @ch-click="handleBackClick">
      ← Volver
    </ChButton>

    <ChCard class="pega-detalle__card">
      <div class="pega-detalle__header">
        <h1 class="pega-detalle__titulo">{{ job.titulo }}</h1>
        <span class="pega-detalle__fecha">{{ publishedDate }}</span>
      </div>

      <p class="pega-detalle__empleador">
        {{ job.empleador }} ·
        <NuxtLink :to="`/categoria/${categorySlug(job.categoria)}`" class="pega-detalle__categoria-link">{{ job.categoria }}</NuxtLink>
      </p>

      <div class="pega-detalle__badges">
        <ChBadge v-if="isRemote" variant="positive">🏠 Remoto</ChBadge>
        <ChBadge v-if="job.sueldo" variant="positive">💰 {{ job.sueldo }}</ChBadge>
        <ChBadge>{{ job.ubicacion }}</ChBadge>
      </div>

      <p class="pega-detalle__descripcion">{{ job.descripcion }}</p>

      <div class="pega-detalle__footer">
        <ChButton class="pega-detalle__apply" @ch-click="handleApplyClick">
          Ver oferta original →
        </ChButton>
        <span class="pega-detalle__fuente">Publicada en {{ sourceLabel(job.fuente) }}</span>
      </div>
    </ChCard>
  </article>
</template>

<style scoped>
.pega-detalle {
  max-width: 900px;
  margin: 0 auto;
}

.pega-detalle__volver {
  display: inline-block;
  margin-bottom: 1.5rem;
}

.pega-detalle__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.pega-detalle__titulo {
  margin: 0;
}

.pega-detalle__fecha {
  flex-shrink: 0;
  font-size: 0.85em;
  color: var(--text-muted, #666);
  white-space: nowrap;
}

.pega-detalle__empleador {
  margin: 0 0 1rem;
  color: var(--text-muted, #666);
}

.pega-detalle__categoria-link {
  color: var(--text-muted, #666);
  text-decoration: underline;
}

.pega-detalle__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.pega-detalle__descripcion {
  margin: 0 0 2rem;
}

.pega-detalle__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.pega-detalle__fuente {
  font-size: 0.85em;
  color: var(--text-muted, #666);
}
</style>
