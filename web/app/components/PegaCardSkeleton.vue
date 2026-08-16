<script setup lang="ts">
import { ChCard } from '@devschile/chucao/vue';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ index?: number }>(), { index: 0 });
const revealDelay = computed(() => Math.min(props.index, 6) * 0.05);
</script>

<template>
  <Reveal class="pega-card-motion" :delay="revealDelay" :duration="0.15" :y="6">
    <ChCard class="pega-card-skeleton">
      <div class="pega-card-skeleton__header">
        <Skeleton width="65%" height="1.2em" />
        <Skeleton width="20%" height="0.85em" />
      </div>
      <Skeleton width="40%" height="0.9em" />
      <div class="pega-card-skeleton__badges">
        <Skeleton width="4.5rem" height="1.4rem" radius="999px" />
        <Skeleton width="3.5rem" height="1.4rem" radius="999px" />
      </div>
      <Skeleton width="100%" height="0.9em" />
      <Skeleton width="80%" height="0.9em" />
    </ChCard>
  </Reveal>
</template>

<style scoped>
.pega-card-motion {
  display: block;
}

.pega-card-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pega-card-skeleton__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.pega-card-skeleton__badges {
  display: flex;
  gap: 0.5rem;
}
</style>
