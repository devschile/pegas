<script setup lang="ts">
/**
 * Envoltorio generico de Motion para animaciones de entrada (fade + slide).
 * Reemplaza el uso directo de <Motion> repetido en cada componente/pagina
 * -- un solo lugar para ajustar la curva/duracion por defecto del sitio.
 */
withDefaults(
  defineProps<{
    /** Delay antes de empezar, en segundos. Para stagger de listas. */
    delay?: number;
    /** Desplazamiento vertical inicial en px (0 = solo fade, sin slide). */
    y?: number;
    duration?: number;
  }>(),
  { delay: 0, y: 12, duration: 0.3 },
);
</script>

<template>
  <Motion
    :initial="{ opacity: 0, y }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration, delay, ease: 'easeOut' }"
  >
    <slot />
  </Motion>
</template>
