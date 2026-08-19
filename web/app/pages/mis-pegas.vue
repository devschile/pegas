<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import { IconAlertTriangle, IconArrowLeft, IconBookmarkOff } from '@tabler/icons-vue';
import { computed } from 'vue';
import type { Pega } from '~/types/pega';
import type { Reaction } from '../../server/utils/reacciones';

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
</style>
