<script setup lang="ts">
/**
 * Botón con relleno de columnas escalonado, tomado de la pieza de referencia
 * de `design/`.
 *
 * Doce columnas que suben (o bajan, alternadas) al pasar el mouse, con
 * `steps()` en la transición para que el barrido se vea a saltos y no como un
 * degradado suave —eso es lo que le da el aire de terminal.
 *
 * A diferencia del original va con borde redondo: el `overflow: hidden` del
 * contenedor recorta las columnas a la forma de la píldora, que es la que usa
 * el resto del sitio.
 */

withDefaults(
  defineProps<{
    href?: string;
    variant?: 'acento' | 'sutil';
  }>(),
  { href: undefined, variant: 'acento' },
);

const COLUMNAS = 12;

/**
 * El retardo por columna es lo que hace el barrido de izquierda a derecha. Va
 * en el estilo inline porque depende del índice y no hay forma de expresarlo
 * en CSS sin doce reglas.
 */
const retardo = (i: number) => ({ '--glyph-delay': `${i * 18}ms` });
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :type="href ? undefined : 'button'"
    class="glyph-btn"
    :class="`glyph-btn--${variant}`"
  >
    <span class="glyph-btn__fill" aria-hidden="true">
      <span v-for="i in COLUMNAS" :key="i" :style="retardo(i - 1)" />
    </span>
    <span class="glyph-btn__label"><slot /></span>
  </component>
</template>

<style scoped>
.glyph-btn {
  isolation: isolate;
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.7rem 1.6rem;
  border: 1px solid currentColor;
  /* El borde redondo del resto del sitio; recorta el relleno a su forma. */
  border-radius: 999px;
  background: transparent;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.glyph-btn--acento {
  --relleno: var(--accent, #2dd4bf);
  --tinta: #06210f;
  color: var(--relleno);
}

.glyph-btn--sutil {
  --relleno: #f2ede9;
  --tinta: #100a1c;
  color: var(--text-muted, #888);
}

.glyph-btn__fill {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  pointer-events: none;
}

.glyph-btn__fill > span {
  min-width: 0;
  background-color: var(--relleno);
  transform: scaleY(0);
  transform-origin: bottom;
  /* steps() y no una curva suave: el barrido tiene que verse a saltos. */
  transition: transform 0.19s steps(4, end);
  transition-delay: var(--glyph-delay);
}

/* Alternar el origen hace que las columnas no suban todas desde abajo. */
.glyph-btn__fill > span:nth-child(2n) {
  transform-origin: top;
}

.glyph-btn__label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.glyph-btn:hover,
.glyph-btn:focus-visible {
  color: var(--tinta);
  border-color: var(--relleno);
}

.glyph-btn:hover .glyph-btn__fill > span,
.glyph-btn:focus-visible .glyph-btn__fill > span {
  transform: scaleY(1);
}

.glyph-btn:focus-visible {
  outline: 2px solid var(--relleno);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .glyph-btn__fill > span {
    transition: none;
  }
}
</style>
