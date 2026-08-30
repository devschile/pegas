<script setup lang="ts">
import { ChCheckbox, ChInput, ChSelect } from '@devschile/chucao/vue';
import { animate, RowValue, useMotionValue, useTransform } from 'motion-v';
import { computed, watch } from 'vue';
import { sourceLabel } from '~/utils/pegas';

const props = defineProps<{
  sources: string[];
  totalVisible: number;
  totalGeneral: number;
}>();

const query = defineModel<string>('query', { required: true });
const source = defineModel<string>('source', { required: true });
const withSalary = defineModel<boolean>('withSalary', { required: true });

const sourceOptions = computed(() => [
  { label: 'Todas las fuentes', value: '' },
  ...props.sources.map(value => ({ label: sourceLabel(value), value })),
]);

/**
 * Cuenta animada (motion-v) en vez de saltar de golpe al cambiar de filtro
 * o pagina. useMotionValue arranca en el valor inicial (SSR/primer paint
 * muestran el numero correcto sin animar desde 0); solo anima en updates
 * posteriores, disparados por el watch.
 */
const visibleCount = useMotionValue(props.totalVisible);
const visibleRounded = useTransform(() => Math.round(visibleCount.get()));
const generalCount = useMotionValue(props.totalGeneral);
const generalRounded = useTransform(() => Math.round(generalCount.get()));

watch(
  () => props.totalVisible,
  value => {
    animate(visibleCount, value, { duration: 0.5 });
  },
);
watch(
  () => props.totalGeneral,
  value => {
    animate(generalCount, value, { duration: 0.5 });
  },
);
</script>

<template>
  <section class="filtros">
    <p class="filtros__stats"><strong><RowValue :value="visibleRounded" /></strong> de <strong><RowValue :value="generalRounded" /></strong> pegas</p>
    <div class="filtros__row">
      <ChInput
        label="Buscar"
        placeholder="Buscar por título, empresa o descripción..."
        :value="query"
        @ch-input="query = $event.detail ?? $event"
      />
      <ChSelect
        label="Fuente"
        :options="sourceOptions"
        :value="source"
        @ch-change="source = $event.detail ?? $event"
      />
    </div>
    <div class="filtros__toggle">
      <ChCheckbox
        label="💰 con sueldo publicado"
        :checked="withSalary"
        @ch-change="withSalary = $event.detail ?? $event"
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

.filtros__toggle {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
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

  /* Con una sola columna no hay select a la derecha con el cual alinearse:
     pegado al borde derecho queda suelto, así que vuelve a la izquierda. */
  .filtros__toggle {
    justify-content: flex-start;
  }
}
</style>
