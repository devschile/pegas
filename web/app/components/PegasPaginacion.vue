<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-vue';

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
    <ChButton class="paginacion__btn" variant="secondary" :disabled="page === 1" @ch-click="emit('prev')">
      <IconChevronLeft :size="16" aria-hidden="true" /> Anterior
    </ChButton>
    <span class="paginacion__info">{{ start }}–{{ end }} de {{ total }}</span>
    <ChButton class="paginacion__btn" variant="secondary" :disabled="page === totalPages" @ch-click="emit('next')">
      Siguiente <IconChevronRight :size="16" aria-hidden="true" />
    </ChButton>
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

.paginacion__btn {
  transition: transform 0.15s ease;
}

.paginacion__btn:active {
  transform: scale(0.95);
}
</style>
