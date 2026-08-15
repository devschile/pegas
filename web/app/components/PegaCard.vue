<script setup lang="ts">
import { ChBadge, ChCard, ChLink } from '@devschile/chucao/vue';
import type { Pega } from '~/types/pega';

defineProps<{ pega: Pega }>();
</script>

<template>
  <ChCard class="pega-card">
    <h3 class="pega-card__titulo">{{ pega.titulo }}</h3>
    <p class="pega-card__empleador">{{ pega.empleador }} · {{ pega.ubicacion }}</p>
    <div class="pega-card__tags">
      <ChBadge>{{ pega.categoria }}</ChBadge>
      <ChBadge v-if="pega.sueldo" variant="positive">{{ pega.sueldo }}</ChBadge>
    </div>
    <ChLink :href="pega.url" target="_blank">Ver aviso</ChLink>
  </ChCard>
</template>

<style scoped>
.pega-card__titulo {
  margin: 0 0 var(--spacing-2xs, 0.25rem);
}

.pega-card__empleador {
  margin: 0 0 var(--spacing-sm, 0.75rem);
  color: var(--text-muted, #666);
}

.pega-card__tags {
  display: flex;
  gap: var(--spacing-2xs, 0.25rem);
  margin-bottom: var(--spacing-sm, 0.75rem);
}
</style>
