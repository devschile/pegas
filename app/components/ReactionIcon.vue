<script setup lang="ts">
import { computed } from 'vue';
import { MorphIcon } from 'morphicons/vue';
import { svgToIcon } from 'morphicons/adapters';
import thumbUpOutline from '@tabler/icons/outline/thumb-up.svg?raw';
import thumbUpFilled from '@tabler/icons/filled/thumb-up.svg?raw';
import thumbDownOutline from '@tabler/icons/outline/thumb-down.svg?raw';
import thumbDownFilled from '@tabler/icons/filled/thumb-down.svg?raw';
import bookmarkOutline from '@tabler/icons/outline/bookmark.svg?raw';
import bookmarkFilled from '@tabler/icons/filled/bookmark.svg?raw';

export type ReactionVariant = 'like' | 'dislike' | 'save';

/**
 * Los SVG de Tabler traen un <path stroke="none" fill="none" d="M0 0h24v24H0z" />
 * de relleno invisible (bounding box de 24x24 para mantener el viewBox
 * consistente entre iconos). svgToIcon() concatena todos los <path> del SVG
 * en un solo path sin respetar ese fill="none" por-path, asi que sin
 * neutralizarlo termina dibujando un cuadrado solido detras del icono.
 * Solo se vacia el `d` (a un punto sin area) -- el atributo fill="none" en
 * si se deja intacto porque svgToIcon lo usa como señal para aceptar el SVG
 * como "stroke-drawn" (si no encuentra ningun fill="none" en el markup,
 * tira "SVG looks fill-drawn").
 */
function stripBoundingBoxPath(svg: string): string {
  return svg.replace('d="M0 0h24v24H0z"', 'd="M0 0"');
}

/** Convertidos una sola vez a nivel de módulo -- svgToIcon() no depende del DOM, es seguro en SSR. */
const ICONS: Record<ReactionVariant, { outline: ReturnType<typeof svgToIcon>; filled: ReturnType<typeof svgToIcon> }> = {
  like: { outline: svgToIcon(stripBoundingBoxPath(thumbUpOutline)), filled: svgToIcon(stripBoundingBoxPath(thumbUpFilled)) },
  dislike: { outline: svgToIcon(stripBoundingBoxPath(thumbDownOutline)), filled: svgToIcon(stripBoundingBoxPath(thumbDownFilled)) },
  save: { outline: svgToIcon(stripBoundingBoxPath(bookmarkOutline)), filled: svgToIcon(stripBoundingBoxPath(bookmarkFilled)) },
};

const props = withDefaults(defineProps<{ variant: ReactionVariant; active: boolean; size?: number }>(), { size: 20 });
const icon = computed(() => (props.active ? ICONS[props.variant].filled : ICONS[props.variant].outline));
</script>

<template>
  <MorphIcon :icon="icon" spring="snappy" reduced-motion="user" :size="size" aria-hidden="true" />
</template>
