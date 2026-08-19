<script setup lang="ts">
import { ChBadge, ChButton, ChCard } from '@devschile/chucao/vue';
import { IconBan, IconCalendar, IconCoin, IconHome } from '@tabler/icons-vue';
import { computed, ref } from 'vue';
import { formatDate, sourceLabel } from '~/utils/pegas';
import { categorySlug, jobSlug } from '~/utils/slug';
import type { Pega } from '~/types/pega';

const props = withDefaults(defineProps<{ job: Pega; index?: number }>(), { index: 0 });
const track = useTrackEvent();
const { loggedIn } = useUserSession();
const { isAdmin } = useMe();
const { states, toggleReaction, toggleSaved } = usePegaReactions();
const desactivada = ref(false);

const publishedDate = computed(() => formatDate(props.job.fecha_publicacion || props.job.fecha_creacion));
const isRemote = computed(() => Boolean(props.job.tags?.includes('remote')));
const detailUrl = computed(() => `/pega/${jobSlug(props.job)}`);
const revealDelay = computed(() => Math.min(props.index, 6) * 0.2);
const state = computed(() => states.value[props.job.id] ?? { reaccion: null, guardada: false });

const likeTooltip = computed(() => (loggedIn.value ? 'Me gusta' : 'Debes estar logueado para dar like'));
const dislikeTooltip = computed(() => (loggedIn.value ? 'No me gusta' : 'Debes estar logueado para dar dislike'));
const saveTooltip = computed(() => (loggedIn.value ? 'Guardar pega' : 'Debes estar logueado para guardar'));

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

async function handleDesactivarClick() {
  await $fetch(`/api/pegas/${props.job.id}/desactivar`, { method: 'POST' });
  desactivada.value = true;
}
</script>

<template>
  <Reveal v-if="!desactivada" class="pega-card-motion" :delay="revealDelay" :duration="0.1">
    <ChCard class="pega-card">
      <div class="pega-card__header">
        <h3 class="pega-card__titulo"><NuxtLink :to="detailUrl">{{ job.titulo }}</NuxtLink></h3>
        <span class="pega-card__fecha"><IconCalendar :size="14" aria-hidden="true" />{{ publishedDate }}</span>
      </div>

      <div class="pega-card__meta">
        <span class="pega-card__empleador">{{ job.empleador }}</span>
        <div class="pega-card__badges">
          <ChBadge v-if="isRemote" variant="positive"><IconHome :size="14" aria-hidden="true" /> Remoto</ChBadge>
          <ChBadge v-if="job.sueldo" variant="positive"><IconCoin :size="14" aria-hidden="true" /> {{ job.sueldo }}</ChBadge>
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
            class="pega-card__reaction-btn"
            :class="{ 'pega-card__reaction-btn--active': state.reaccion === 'like' }"
            variant="primary"
            :disabled="!loggedIn"
            :title="likeTooltip"
            label="Me gusta"
            @ch-click="handleLikeClick"
          ><ReactionIcon variant="like" :active="state.reaccion === 'like'" /></ChButton>
          <ChButton
            class="pega-card__reaction-btn"
            :class="{ 'pega-card__reaction-btn--active': state.reaccion === 'dislike' }"
            variant="primary"
            :disabled="!loggedIn"
            :title="dislikeTooltip"
            label="No me gusta"
            @ch-click="handleDislikeClick"
          ><ReactionIcon variant="dislike" :active="state.reaccion === 'dislike'" /></ChButton>
          <ChButton
            class="pega-card__reaction-btn"
            :class="{ 'pega-card__reaction-btn--active': state.guardada }"
            variant="primary"
            :disabled="!loggedIn"
            :title="saveTooltip"
            label="Guardar"
            @ch-click="handleSaveClick"
          ><ReactionIcon variant="save" :active="state.guardada" /></ChButton>
        </div>
        <span class="pega-card__fuente">{{ sourceLabel(job.fuente) }}</span>
        <ChButton
          v-if="isAdmin"
          class="pega-card__desactivar"
          variant="secondary"
          title="Desactivar pega (solo admins)"
          label="Desactivar"
          @ch-click="handleDesactivarClick"
        ><IconBan :size="16" aria-hidden="true" /> Desactivar</ChButton>
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
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
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
  /* pisa los tokens de ch-button (custom properties, atraviesan su shadow DOM)
     solo para estos tres botones: fondo naranja siempre (variant primary
     fijo, ver template), icono blanco (el default de --color-accent-text
     es casi negro) y padding parejo -> pill circular. El borde en cambio
     NO tiene hook de custom property en .btn--primary (chucao solo le pone
     borde a .btn--secondary), asi que se aplica directo sobre el host del
     custom element (luz, no atraviesa su shadow DOM -- ver reaction-btn). */
  --accent: #fb923c;
  --accent-hover: #fdba74;
  --color-accent-text: #ffffff;
  --spacing-xl: var(--spacing-sm, 0.35rem);
}

.pega-card__reaction-btn {
  border: 2px solid #fdba74;
  border-radius: 999px;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.pega-card__reaction-btn:active {
  transform: scale(0.9);
}

.pega-card__reaction-btn--active {
  border-color: #ffffff;
}

.pega-card__fuente {
  font-size: 0.85em;
  color: var(--text-muted, #666);
}

.pega-card__desactivar {
  --border: #f87171;
  --border-hover: #f87171;
  --surface-hover: rgba(248, 113, 113, 0.12);
  --text: #f87171;
}
</style>
