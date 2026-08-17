<script setup lang="ts">
import { ChBadge, ChButton, ChCard } from '@devschile/chucao/vue';
import { computed } from 'vue';
import { formatDate, sourceLabel } from '~/utils/pegas';
import { categorySlug, jobSlug } from '~/utils/slug';
import type { Pega } from '~/types/pega';

const props = withDefaults(defineProps<{ job: Pega; index?: number }>(), { index: 0 });
const track = useTrackEvent();
const { loggedIn } = useUserSession();
const { states, toggleReaction, toggleSaved } = usePegaReactions();

const publishedDate = computed(() => formatDate(props.job.fecha_publicacion || props.job.fecha_creacion));
const isRemote = computed(() => Boolean(props.job.tags?.includes('remote')));
const detailUrl = computed(() => `/pega/${jobSlug(props.job)}`);
const revealDelay = computed(() => Math.min(props.index, 6) * 0.2);
const state = computed(() => states.value[props.job.id] ?? { reaccion: null, guardada: false });

function handleApplyClick() {
  track('pega_click_apply', {
    pega_id: props.job.id,
    categoria: props.job.categoria,
    fuente: props.job.fuente,
    empleador: props.job.empleador,
  });
  window.open(props.job.url, '_blank', 'noopener,noreferrer');
}

function handleLikeClick() {
  toggleReaction(props.job.id, 'like');
}

function handleDislikeClick() {
  toggleReaction(props.job.id, 'dislike');
}

function handleSaveClick() {
  toggleSaved(props.job.id);
}
</script>

<template>
  <Reveal class="pega-card-motion" :delay="revealDelay" :duration="0.1">
    <ChCard class="pega-card">
      <div class="pega-card__header">
        <h3 class="pega-card__titulo"><NuxtLink :to="detailUrl">{{ job.titulo }}</NuxtLink></h3>
        <span class="pega-card__fecha">{{ publishedDate }}</span>
      </div>

      <div class="pega-card__meta">
        <span class="pega-card__empleador">{{ job.empleador }}</span>
        <div class="pega-card__badges">
          <ChBadge v-if="isRemote" variant="positive">🏠 Remoto</ChBadge>
          <ChBadge v-if="job.sueldo" variant="positive">💰 {{ job.sueldo }}</ChBadge>
          <NuxtLink :to="`/categoria/${categorySlug(job.categoria)}`" class="pega-card__categoria-link">
            <ChBadge>{{ job.categoria }}</ChBadge>
          </NuxtLink>
          <ChBadge>{{ job.ubicacion }}</ChBadge>
        </div>
      </div>

      <p class="pega-card__descripcion">{{ job.descripcion }}</p>

      <div class="pega-card__footer">
        <ChButton class="pega-card__apply" @ch-click="handleApplyClick">Ver oferta</ChButton>
        <div class="pega-card__reactions">
          <ChButton
            :variant="state.reaccion === 'like' ? 'primary' : 'secondary'"
            :disabled="!loggedIn"
            label="Me gusta"
            @ch-click="handleLikeClick"
          >👍</ChButton>
          <ChButton
            :variant="state.reaccion === 'dislike' ? 'primary' : 'secondary'"
            :disabled="!loggedIn"
            label="No me gusta"
            @ch-click="handleDislikeClick"
          >👎</ChButton>
          <ChButton
            :variant="state.guardada ? 'primary' : 'secondary'"
            :disabled="!loggedIn"
            label="Guardar"
            @ch-click="handleSaveClick"
          >🔖</ChButton>
        </div>
        <span class="pega-card__fuente">{{ sourceLabel(job.fuente) }}</span>
      </div>
    </ChCard>
  </Reveal>
</template>

<style scoped>
.pega-card-motion {
  display: block;
}

.pega-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--spacing-sm, 0.75rem);
  margin-bottom: .75rem;
}

.pega-card__titulo {
  margin: 0;
}

.pega-card__titulo a {
  color: inherit;
  text-decoration: none;
}

.pega-card__titulo a:hover {
  color: var(--accent, #2dd4bf);
}

.pega-card__fecha {
  flex-shrink: 0;
  font-size: 0.85em;
  color: var(--text-muted, #666);
  white-space: nowrap;
}

.pega-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-xs, 0.5rem);
  margin: var(--spacing-2xs, 0.25rem) 0 var(--spacing-sm, 0.75rem);
}

.pega-card__empleador {
  color: var(--text-muted, #666);
}

.pega-card__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2xs, 0.25rem);
}

.pega-card__categoria-link {
  display: inline-flex;
  text-decoration: none;
}

.pega-card__descripcion {
  margin: 0 0 1rem;
}

.pega-card__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.pega-card__reactions {
  display: flex;
  gap: 0.5rem;
}

.pega-card__fuente {
  font-size: 0.85em;
  color: var(--text-muted, #666);
}
</style>
