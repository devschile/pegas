<script setup lang="ts">
/**
 * Wordmark apilado: cada letra ocupa una celda de la misma grilla que usa el
 * campo de glifos, con el fondo pintado y la letra calada encima.
 *
 * Portado de la pieza de referencia de `design/`. Cada línea toma un tono
 * distinto de la rampa, así que la marca queda hecha de bloques de color en
 * vez de tipografía suelta —que es lo que la hace leerse como un logo y no
 * como un título más.
 *
 * No es decorativo: dice el nombre, así que va con su texto accesible y las
 * celdas quedan ocultas para el lector de pantalla.
 */

withDefaults(defineProps<{ lineas?: string[] }>(), {
  lineas: () => ['devs', 'Chile'],
});

/**
 * Un solo tono que se va oscureciendo línea a línea, con la letra clara
 * encima. Es lo que hace que se lea como un logo de bloques y no como líneas
 * de colores distintos peleando entre sí.
 */
const TONOS = ['#2f8f63', '#256f4d', '#1b5038', '#123424'];
const TINTA = '#f2ede9';
</script>

<template>
  <div class="wordmark">
    <span class="wordmark__texto">{{ lineas.join('') }}</span>
    <div
      v-for="(linea, i) in lineas"
      :key="i"
      class="wordmark__linea"
      aria-hidden="true"
      :style="{ '--fondo': TONOS[i % TONOS.length], '--tinta': TINTA }"
    >
      <span v-for="(letra, j) in [...linea]" :key="j" class="wordmark__celda">{{ letra }}</span>
    </div>
  </div>
</template>

<style scoped>
.wordmark {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
  font-size: clamp(24px, 8vw, 52px);
  user-select: none;
}

/* El nombre para quien no ve las celdas. */
.wordmark__texto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.wordmark__linea {
  display: flex;
}

/* 22/34 y 40/34 em: la misma celda que el campo de glifos, para que las dos
   piezas se lean como parte de la misma grilla. */
.wordmark__celda {
  display: grid;
  place-items: center;
  width: calc(22 / 34 * 1em);
  height: calc(40 / 34 * 1em);
  background: var(--fondo);
  color: var(--tinta);
}
</style>
