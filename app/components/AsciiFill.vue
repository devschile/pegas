<script setup lang="ts">
import { ref } from 'vue';

/**
 * Textura ASCII animada con barrido por columnas, para representar un espacio
 * publicitario dentro del esquema del sitio.
 *
 * Usa la rampa de sombreado `░▒▓` de la pieza de referencia de `design/`: una
 * banda recorre la grilla de izquierda a derecha y las celdas se densifican
 * según lo cerca que estén de ella. Es el mismo idioma que el campo de
 * brackets del hero, pero contenido en una caja.
 *
 * Decorativo: va con `aria-hidden` y el texto del espacio lo pone quien lo usa.
 */

const props = withDefaults(
  defineProps<{
    /** Encendido: el barrido se acelera y toma el color de acción. */
    activo?: boolean;
    filas?: number;
  }>(),
  { activo: false, filas: 3 },
);

const raiz = ref<HTMLElement | null>(null);

/** De menos a más denso. El espacio deja respirar la caja. */
const RAMPA = [' ', '░', '░', '▒', '▓'];
const COLUMNAS = 44;
/** Columnas por ms: un barrido completo dura ~3,5 s. */
const VELOCIDAD = 0.017;

function construir(root: HTMLElement) {
  const celdas: HTMLElement[] = [];
  for (let y = 0; y < props.filas; y++) {
    const fila = document.createElement('div');
    fila.className = 'ascii-fill__row';
    for (let x = 0; x < COLUMNAS; x++) {
      const span = document.createElement('span');
      fila.appendChild(span);
      celdas.push(span);
    }
    root.appendChild(fila);
  }

  return (t: number) => {
    // La banda avanza más rápido cuando el espacio está resaltado: es la señal
    // de que ese es el que se está mirando.
    const avance = t * VELOCIDAD * (props.activo ? 2.4 : 1);
    // El desfase inicial evita que el primer fotograma salga vacío: sin él la
    // banda arranca fuera de la grilla y la caja se ve hueca hasta que entra.
    const banda = ((avance + COLUMNAS * 0.4) % (COLUMNAS + 16)) - 8;

    for (const [i, el] of celdas.entries()) {
      const x = i % COLUMNAS;
      const y = Math.floor(i / COLUMNAS);
      // El desfase por fila evita que la banda se vea como una barra recta.
      const distancia = Math.abs(x - banda + y * 2.5);
      const nivel = distancia > 9 ? 0 : Math.max(0, RAMPA.length - 1 - Math.floor(distancia / 2));
      const ch = RAMPA[nivel]!;
      if (el.textContent !== ch) el.textContent = ch;
    }
  };
}

useAnimacionAscii(raiz, construir);
</script>

<template>
  <div ref="raiz" class="ascii-fill" :class="{ 'ascii-fill--activo': activo }" aria-hidden="true" />
</template>

<style scoped>
.ascii-fill {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.55rem;
  line-height: 1.05;
  letter-spacing: 0.08em;
  color: var(--pub-verde, #3ecf8e);
  opacity: 0.3;
  pointer-events: none;
  user-select: none;
  transition: opacity 0.25s ease, color 0.25s ease;
}

.ascii-fill--activo {
  color: var(--pub-accion, #ffc247);
  opacity: 0.75;
}

:deep(.ascii-fill__row) {
  white-space: pre;
  text-align: center;
}
</style>
