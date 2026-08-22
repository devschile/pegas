<script setup lang="ts">
import { ChBadge, ChButton, ChCard } from '@devschile/chucao/vue';
import { IconBan, IconCoin, IconHome } from '@tabler/icons-vue';
import { computed, ref } from 'vue';
import { formatDate, sourceLabel } from '~/utils/pegas';
import { categorySlug, jobSlug } from '~/utils/slug';
import type { Pega } from '~/types/pega';

const props = withDefaults(defineProps<{ job: Pega; index?: number }>(), { index: 0 });
const track = useTrackEvent();
const { loggedIn } = useUserSession();
const { isAdmin } = useMe();
const { states, deltas, toggleReaction, toggleSaved } = usePegaReactions();
const { open: userMenuOpen } = useUserMenu();
const desactivada = ref(false);

const publishedDate = computed(() => formatDate(props.job.fecha_publicacion || props.job.fecha_creacion));
const isRemote = computed(() => Boolean(props.job.tags?.includes('remote')));
const detailUrl = computed(() => `/pega/${jobSlug(props.job)}`);
const revealDelay = computed(() => Math.min(props.index, 6) * 0.2);
const state = computed(() => states.value[props.job.id] ?? { reaccion: null, guardada: false });

/**
 * Conteo público (viene con la pega, ya incluye la reacción propia al
 * momento de cargar) + lo que el usuario cambió después en esta sesión --
 * ver el comentario de `bump` en usePegaReactions.
 */
const delta = computed(() => deltas.value[props.job.id] ?? { likes: 0, dislikes: 0, guardados: 0 });
const likes = computed(() => (props.job.likes ?? 0) + delta.value.likes);
const dislikes = computed(() => (props.job.dislikes ?? 0) + delta.value.dislikes);
const guardados = computed(() => (props.job.guardados ?? 0) + delta.value.guardados);

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

/** `.stop` en el template: sin eso el mismo click llega al listener de document de UserMenu y lo cierra al instante. */
function handleLoginClick() {
  userMenuOpen.value = true;
}

/** Un solo click en un icono sin etiqueta desactivaba la pega al toque -- fácil de gatillar sin querer. */
async function handleDesactivarClick() {
  if (!confirm(`¿Desactivar "${props.job.titulo}"? Deja de verse en el listado público. Se puede reactivar desde /mis-pegas.`)) return;
  await $fetch(`/api/pegas/${props.job.id}/desactivar`, { method: 'POST' });
  desactivada.value = true;
}
</script>

<template>
  <Reveal v-if="!desactivada" class="pega-card-motion" :delay="revealDelay" :duration="0.1">
    <ChCard class="pega-card">
      <div class="pega-card__head">
        <div class="pega-card__ident">
          <h3 class="pega-card__titulo"><NuxtLink :to="detailUrl">{{ job.titulo }}</NuxtLink></h3>
          <p class="pega-card__empleador">{{ job.empleador }} · {{ job.ubicacion }}</p>
        </div>

        <div class="pega-card__aside">
          <span class="pega-card__fecha">{{ publishedDate }}</span>
          <div class="pega-card__badges">
            <NuxtLink :to="`/categoria/${categorySlug(job.categoria)}`" class="pega-card__categoria-link">
              <ChBadge>{{ job.categoria }}</ChBadge>
            </NuxtLink>
            <ChBadge v-if="isRemote" class="pega-card__badge--tenue"><IconHome :size="12" aria-hidden="true" /> Remoto</ChBadge>
            <ChBadge v-if="job.sueldo" class="pega-card__badge--tenue"><IconCoin :size="12" aria-hidden="true" /> {{ job.sueldo }}</ChBadge>
          </div>
          <span class="pega-card__fecha">{{ sourceLabel(job.fuente) }}</span>
        </div>
      </div>

      <div class="pega-card__footer">
        <ChButton class="pega-card__apply" @ch-click="handleApplyClick">Ver oferta</ChButton>

        <div v-if="loggedIn" class="pega-card__acciones">
          <button
            type="button"
            class="pega-card__accion"
            :class="{ 'pega-card__accion--activa': state.reaccion === 'like' }"
            title="Me interesa"
            aria-label="Me gusta"
            @click="handleLikeClick"
          >
            <ReactionIcon variant="like" :active="state.reaccion === 'like'" :size="16" />
            <span>{{ likes }}</span>
          </button>

          <button
            type="button"
            class="pega-card__accion pega-card__accion--negativa"
            :class="{ 'pega-card__accion--activa': state.reaccion === 'dislike' }"
            title="No me interesa"
            aria-label="No me gusta"
            @click="handleDislikeClick"
          >
            <ReactionIcon variant="dislike" :active="state.reaccion === 'dislike'" :size="16" />
            <span>{{ dislikes }}</span>
          </button>

          <span class="pega-card__sep" aria-hidden="true"></span>

          <button
            type="button"
            class="pega-card__accion pega-card__accion--guardar"
            :class="{ 'pega-card__accion--activa': state.guardada }"
            :title="state.guardada ? 'Quitar de guardadas' : 'Guardar pega'"
            aria-label="Guardar"
            @click="handleSaveClick"
          >
            <ReactionIcon variant="save" :active="state.guardada" :size="16" />
            <span>{{ state.guardada ? 'Guardada' : 'Guardar' }}</span>
            <span class="pega-card__accion-conteo">{{ guardados }}</span>
          </button>

          <button
            v-if="isAdmin"
            type="button"
            class="pega-card__accion pega-card__accion--negativa"
            title="Desactivar pega (solo admins)"
            aria-label="Desactivar"
            @click="handleDesactivarClick"
          >
            <IconBan :size="16" aria-hidden="true" />
          </button>
        </div>

        <div v-else class="pega-card__acciones">
          <div class="pega-card__conteos-anon" title="Inicia sesión para calificar y guardar">
            <span class="pega-card__accion"><ReactionIcon variant="like" :active="false" :size="16" />{{ likes }}</span>
            <span class="pega-card__accion"><ReactionIcon variant="dislike" :active="false" :size="16" />{{ dislikes }}</span>
            <span class="pega-card__accion"><ReactionIcon variant="save" :active="false" :size="16" />{{ guardados }}</span>
          </div>
          <button type="button" class="pega-card__login" @click.stop="handleLoginClick">Inicia sesión</button>
        </div>
      </div>
    </ChCard>
  </Reveal>
</template>

<style scoped>
.pega-card-motion {
  display: block;
}

/* Tokens de chucao pisados solo para esta card (custom properties: cruzan
   el shadow DOM de ch-card). El fondo degradado y el radio mayor vienen del
   diseño; la barra de acento izquierda en hover ya la trae ch-card. */
.pega-card {
  --surface: linear-gradient(180deg, #16132d, #120f24);
  --radius: 14px;
}

.pega-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
}

.pega-card__ident {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.pega-card__titulo {
  margin: 0;
  font-size: 1.3rem;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.pega-card__titulo a {
  color: var(--text);
  text-decoration: none;
}

.pega-card__titulo a:hover {
  color: var(--accent);
}

.pega-card__empleador {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.pega-card__aside {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.625rem;
  flex-shrink: 0;
}

.pega-card__fecha {
  font-family: var(--font-heading);
  font-size: 0.8rem;
  color: #6f6b8a;
  white-space: nowrap;
}

.pega-card__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.375rem;
}

.pega-card__categoria-link {
  display: inline-flex;
  text-decoration: none;
}

/* La categoria queda en acento (default de ch-badge) y el resto en gris,
   para que sea el ancla visual del bloque -- igual que en el diseño. */
.pega-card__badge--tenue {
  --accent: #9b95c9;
  --color-surface-hover: rgba(155, 149, 201, 0.08);
}

.pega-card__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-top: 1.125rem;
  padding-top: 1rem;
  border-top: 1px solid #201d3b;
}

.pega-card__acciones {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.pega-card__accion {
  appearance: none;
  border: none;
  outline: none;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4375rem;
  padding: 0.4375rem 0.6875rem;
  border-radius: 9px;
  font-family: var(--font-heading);
  font-size: 0.8rem;
  font-weight: var(--typography-weight-regular);
  background: transparent;
  color: #6f6b8a;
  transition: background 120ms ease, color 120ms ease, transform 0.15s ease;
}

button.pega-card__accion {
  cursor: pointer;
}

button.pega-card__accion:hover {
  background: rgba(45, 212, 191, 0.14);
  color: var(--accent);
}

button.pega-card__accion:active {
  transform: scale(0.94);
}

.pega-card__accion--activa {
  background: rgba(45, 212, 191, 0.1);
  color: var(--accent);
}

button.pega-card__accion--negativa:hover,
.pega-card__accion--negativa.pega-card__accion--activa {
  background: rgba(255, 139, 123, 0.12);
  color: #ff8b7b;
}

/* Guardar en naranjo y no en el acento: guardar es marcar algo para
   despues, no valorarlo -- conviene que se lea distinto de like/nolike. */
button.pega-card__accion--guardar:hover,
.pega-card__accion--guardar.pega-card__accion--activa {
  background: rgba(251, 146, 60, 0.14);
  color: #fb923c;
}

.pega-card__accion-conteo {
  opacity: 0.6;
}

.pega-card__sep {
  width: 1px;
  height: 20px;
  background: #2c2850;
  margin: 0 0.375rem;
}

.pega-card__conteos-anon {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0.4;
}

.pega-card__login {
  appearance: none;
  background: none;
  border: none;
  border-bottom: 1px solid #35315c;
  padding: 0 0 1px;
  margin-left: 0.5rem;
  font-family: inherit;
  font-size: 0.8rem;
  color: #7d78a8;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}

.pega-card__login:hover {
  color: var(--accent);
  border-color: var(--accent);
}

@media (max-width: 640px) {
  .pega-card__head {
    flex-direction: column;
    gap: 0.75rem;
  }

  .pega-card__aside {
    align-items: flex-start;
  }

  .pega-card__badges {
    justify-content: flex-start;
  }
}
</style>
