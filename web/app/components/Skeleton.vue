<script setup lang="ts">
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: '1em',
  radius: 'var(--radius, 6px)',
});
</script>

<template>
  <span class="skeleton" :style="{ width, height, borderRadius: radius }" aria-hidden="true" />
</template>

<style scoped>
.skeleton {
  display: block;
  background: linear-gradient(
    90deg,
    var(--surface, rgba(32, 30, 64, 0.6)) 25%,
    var(--surface-hover, rgba(45, 212, 191, 0.08)) 50%,
    var(--surface, rgba(32, 30, 64, 0.6)) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>
