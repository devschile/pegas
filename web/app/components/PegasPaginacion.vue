<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';

defineProps<{
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
}>();

const emit = defineEmits<{ prev: []; next: [] }>();
</script>

<template>
  <div v-if="totalPages > 1" class="paginacion">
    <ChButton variant="secondary" :disabled="page === 1" data-allow-mismatch="class" @ch-click="emit('prev')">← Anterior</ChButton>
    <span class="paginacion__info">{{ start }}–{{ end }} de {{ total }}</span>
    <ChButton variant="secondary" :disabled="page === totalPages" data-allow-mismatch="class" @ch-click="emit('next')">Siguiente →</ChButton>
  </div>
</template>

<style scoped>
.paginacion {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md, 1rem);
  margin-top: var(--spacing-lg, 1.5rem);
}

.paginacion__info {
  color: var(--text-muted, #666);
}
</style>
