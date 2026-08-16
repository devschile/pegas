<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 9 });
</script>

<template>
  <div class="pegas-grid" aria-busy="true" aria-label="Cargando pegas">
    <PegaCardSkeleton v-for="i in count" :key="i" :index="i - 1" />
  </div>
</template>
