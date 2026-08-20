<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import { IconAlertTriangle, IconArrowLeft, IconBan, IconBookmarkOff, IconArrowBackUp } from '@tabler/icons-vue';
import { computed, ref } from 'vue';
import type { Pega } from '~/types/pega';
import type { Reaction } from '../../server/utils/reacciones';
import type { PegaDesactivada } from '../../server/api/pegas/desactivadas.get';
import { formatDate, sourceLabel } from '~/utils/pegas';

const { loggedIn } = useUserSession();
if (!loggedIn.value) {
  await navigateTo('/');
}

type MiPega = Pega & { reaccion: Reaction | null; guardada: boolean };

const { data, error } = await useFetch<MiPega[]>('/api/me/pegas', { key: 'mis-pegas' });

/** Siembra el estado compartido con lo que ya vino en esta misma respuesta -- evita un segundo round-trip a /api/me/pegas-estado para las mismas pegas. */
const { states } = usePegaReactions();
for (const pega of data.value ?? []) {
  states.value[pega.id] = { reaccion: pega.reaccion, guardada: pega.guardada };
}

const pegas = computed<Pega[]>(() => data.value ?? []);

/**
 * Sin gate por isAdmin antes de pedir esto -- evita depender del orden de
 * resolucion entre este fetch y el de useMe() (ambos corren en paralelo).
 * Para quien no es admin el server devuelve 403 (requireAdmin) y
 * simplemente no se renderiza la seccion; el costo de ese pedido de mas
 * para un usuario logueado no-admin es despreciable.
 */
const { isAdmin } = useMe();
const { data: desactivadas } = await useFetch<PegaDesactivada[]>('/api/pegas/desactivadas', {
  key: 'pegas-desactivadas',
});

const reactivando = ref<number | null>(null);

/**
 * Deshacer una desactivación: la saca de la lista en el acto y la devuelve
 * al listado publico. Sin esto la unica forma de revertir un click en el
 * boton de desactivar era ir a la base a mano.
 */
async function handleReactivarClick(id: number) {
  reactivando.value = id;
  try {
    await $fetch(`/api/pegas/${id}/activar`, { method: 'POST' });
    desactivadas.value = (desactivadas.value ?? []).filter(pega => pega.id !== id);
  } finally {
    reactivando.value = null;
  }
}

const router = useRouter();

function handleBackClick() {
  router.push('/');
}

useSeoMeta({
  title: 'Mis pegas',
  description: 'Pegas que guardaste o marcaste con like/nolike.',
});
</script>

<template>
  <div class="mis-pegas">
    <ChButton class="mis-pegas__volver" variant="secondary" @ch-click="handleBackClick">
      <IconArrowLeft :size="16" aria-hidden="true" /> Volver
    </ChButton>

    <h1 class="mis-pegas__titulo">Mis pegas</h1>

    <p v-if="error" class="mis-pegas__mensaje"><IconAlertTriangle aria-hidden="true" /> Error al cargar tus pegas</p>
    <p v-else-if="pegas.length === 0" class="mis-pegas__mensaje"><IconBookmarkOff aria-hidden="true" /> Todavía no guardaste ni reaccionaste a ninguna pega</p>

    <div v-else class="pegas-grid">
      <PegaCard v-for="(job, index) in pegas" :key="job.id" :job="job" :index="index" />
    </div>

    <section v-if="isAdmin && desactivadas?.length" class="pegas-desactivadas">
      <h2 class="pegas-desactivadas__titulo"><IconBan :size="20" aria-hidden="true" /> Pegas desactivadas ({{ desactivadas.length }})</h2>
      <ul class="pegas-desactivadas__lista">
        <li v-for="pega in desactivadas" :key="pega.id" class="pegas-desactivadas__item">
          <div class="pegas-desactivadas__datos">
            <span class="pegas-desactivadas__titulo-pega">{{ pega.titulo }}</span>
            <span class="pegas-desactivadas__meta">{{ pega.empleador }} · {{ pega.categoria }} · {{ sourceLabel(pega.fuente) }} · {{ formatDate(pega.fecha_actualizacion) }}</span>
          </div>
          <button
            type="button"
            class="pegas-desactivadas__reactivar"
            :disabled="reactivando === pega.id"
            :aria-label="`Reactivar ${pega.titulo}`"
            @click="handleReactivarClick(pega.id)"
          >
            <IconArrowBackUp :size="16" aria-hidden="true" /> Reactivar
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.mis-pegas__volver {
  display: inline-block;
  margin-bottom: 1.5rem;
}

.mis-pegas__titulo {
  margin-bottom: 1.5rem;
}

.mis-pegas__mensaje {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 4rem 0;
  color: var(--text-muted, #666);
}

.pegas-desactivadas {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}

.pegas-desactivadas__titulo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f87171;
  margin-bottom: 1rem;
}

.pegas-desactivadas__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pegas-desactivadas__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.06));
}

.pegas-desactivadas__datos {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.pegas-desactivadas__reactivar {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 999px;
  background: none;
  font-family: inherit;
  font-size: 0.85em;
  color: var(--text-muted, #666);
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}

.pegas-desactivadas__reactivar:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.pegas-desactivadas__reactivar:active:not(:disabled) {
  transform: scale(0.95);
}

.pegas-desactivadas__reactivar:disabled {
  opacity: var(--opacity-disabled, 0.5);
  cursor: progress;
}

.pegas-desactivadas__titulo-pega {
  font-weight: var(--typography-weight-bold);
}

.pegas-desactivadas__meta {
  font-size: 0.85em;
  color: var(--text-muted, #666);
}
</style>
