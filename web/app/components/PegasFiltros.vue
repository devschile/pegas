<script setup lang="ts">
import { ChInput, ChSelect } from '@devschile/chucao/vue';
import { computed } from 'vue';
import { sourceLabel } from '~/utils/pegas';

const props = defineProps<{
  sources: string[];
  totalVisible: number;
  totalGeneral: number;
}>();

const query = defineModel<string>('query', { required: true });
const source = defineModel<string>('source', { required: true });

const sourceOptions = computed(() => [
  { label: 'Todas las fuentes', value: '' },
  ...props.sources.map(value => ({ label: sourceLabel(value), value })),
]);
</script>

<template>
  <section class="filtros">
    <p class="filtros__stats"><strong>{{ totalVisible }}</strong> de <strong>{{ totalGeneral }}</strong> pegas</p>
    <div class="filtros__row">
      <ChInput
        label="Buscar"
        placeholder="Buscar por título, empresa o descripción..."
        :value="query"
        data-allow-mismatch="class"
        @ch-input="query = $event.detail ?? $event"
      />
      <ChSelect
        label="Fuente"
        :options="sourceOptions"
        :value="source"
        data-allow-mismatch="class"
        @ch-change="source = $event.detail ?? $event"
      />
    </div>
  </section>
</template>

<style scoped>
.filtros {
  margin-bottom: 1rem;
}

.filtros__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.filtros__stats {
  margin: 0 0 2rem;
  text-align: center;
  color: var(--text-muted, #666);
}

@media (max-width: 640px) {
  .filtros__row {
    grid-template-columns: 1fr;
  }
}
</style>
