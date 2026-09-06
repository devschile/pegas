<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Campo de brackets con barrido radial, de fondo.
 *
 * La técnica viene de la pieza de referencia que guardamos en `design/`: una
 * grilla de caracteres monoespaciados donde un barrido angular decide el
 * color y la intensidad de cada celda. La rampa de tonos es la de devsChile
 * —del acento a la tiza— y no la de la pieza original: tomamos el recurso, no
 * la identidad de otra marca.
 *
 * Es decorativo, así que va con `aria-hidden`. Nada de lo que dice la página
 * depende de esto.
 */

const props = withDefaults(defineProps<{ mirror?: boolean }>(), { mirror: false });

const raiz = ref<HTMLElement | null>(null);

const ABIERTOS = ['‹', '{', '[', '('];
const CERRADOS = ['›', '}', ']', ')'];
/** Filas de largo desparejo: un rectángulo perfecto se lee como una tabla. */
const FILAS = [26, 24, 28, 24, 26];
const VELOCIDAD = 0.00055; // rad/ms
const PASO_GLIFO = 170; // ms entre cambios de caracter

const mod = (a: number, n: number) => ((a % n) + n) % n;

function celda(x: number, y: number, cols: number, filas: number, t: number, espejo: boolean) {
  const cx = (cols - 1) / 2;
  const cy = (filas - 1) / 2;
  const nx = x - cx;
  const angulo = Math.atan2(y - cy, nx);
  const barrido = mod(t * VELOCIDAD, Math.PI * 2);

  const paso = Math.floor(t / PASO_GLIFO + y * 1.7 + Math.abs(nx) * 0.8);
  const izquierda = espejo ? x > cx : x <= cx;
  const glifos = izquierda ? ABIERTOS : CERRADOS;

  const tono = mod(angulo - barrido, Math.PI * 2) / (Math.PI * 2);
  const distancia = Math.min(mod(angulo - barrido, Math.PI * 2), mod(barrido - angulo, Math.PI * 2));

  return {
    ch: glifos[mod(paso, glifos.length)]!,
    banda: Math.min(4, Math.floor(tono * 5)),
    // El haz va nítido y el resto se apaga: es lo que da la sensación de radar.
    peso: distancia < 0.16 ? 1 : distancia < 0.42 ? 0.85 : distancia < 0.78 ? 0.55 : 0.28,
  };
}

let raf = 0;
let observer: IntersectionObserver | null = null;
let reduce: MediaQueryList | null = null;
let pintar: ((t: number) => void) | null = null;
let visible = true;

function construir(root: HTMLElement) {
  const celdas: Array<{ el: HTMLElement; x: number; y: number; cols: number }> = [];
  for (const [y, cols] of FILAS.entries()) {
    const fila = document.createElement('div');
    fila.className = 'glyph-field__row';
    fila.style.gridTemplateColumns = `repeat(${cols}, calc(22 / 34 * 1em))`;
    for (let x = 0; x < cols; x++) {
      const span = document.createElement('span');
      span.className = 'glyph-field__cell';
      fila.appendChild(span);
      celdas.push({ el: span, x, y, cols });
    }
    root.appendChild(fila);
  }

  return (t: number) => {
    for (const c of celdas) {
      const v = celda(c.x, c.y, c.cols, FILAS.length, t, props.mirror);
      if (c.el.textContent !== v.ch) c.el.textContent = v.ch;
      const banda = String(v.banda);
      if (c.el.dataset.banda !== banda) c.el.dataset.banda = banda;
      const op = String(v.peso);
      if (c.el.style.opacity !== op) c.el.style.opacity = op;
    }
  };
}

let inicio = 0;
function tick(ahora: number) {
  pintar?.(ahora - inicio);
  raf = requestAnimationFrame(tick);
}

function arrancar() {
  if (raf || !visible || reduce?.matches) return;
  inicio = performance.now();
  raf = requestAnimationFrame(tick);
}

function detener() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
}

onMounted(() => {
  if (!raiz.value) return;
  pintar = construir(raiz.value);
  pintar(0);

  reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduce.addEventListener?.('change', () => (reduce!.matches ? detener() : arrancar()));

  // Un rAF corriendo fuera de pantalla es batería regalada.
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      e => {
        visible = e[0]?.isIntersecting ?? false;
        if (visible) arrancar();
        else detener();
      },
      { rootMargin: '80px' },
    );
    observer.observe(raiz.value);
  }
  arrancar();
});

onBeforeUnmount(() => {
  detener();
  observer?.disconnect();
});
</script>

<template>
  <div
    ref="raiz"
    class="glyph-field"
    :class="{ 'glyph-field--mirror': mirror }"
    aria-hidden="true"
  />
</template>

<style scoped>
.glyph-field {
  position: absolute;
  top: 50%;
  z-index: -10;
  transform: translateY(-50%);
  display: none;
  flex-direction: column;
  width: max-content;
  left: 0;
  align-items: flex-start;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.8rem, 1.4vw, 1.05rem);
  line-height: 1;
  opacity: 0.7;
  pointer-events: none;
  user-select: none;

  /* Rampa de devsChile: del acento a la tiza, cinco pasos. */
  --banda-0: #2dd4bf;
  --banda-1: #5ee8d4;
  --banda-2: #93efe1;
  --banda-3: #c9f6ee;
  --banda-4: #f2ede9;
}

.glyph-field--mirror {
  left: auto;
  right: 0;
  align-items: flex-end;
}

/* En pantallas angostas el campo tapa el texto: se muestra solo el espejado. */
.glyph-field--mirror {
  display: flex;
}

@media (min-width: 640px) {
  .glyph-field {
    display: flex;
  }
}

:deep(.glyph-field__row) {
  display: grid;
  width: fit-content;
  flex-shrink: 0;
}

:deep(.glyph-field__cell) {
  display: grid;
  place-items: center;
  width: calc(22 / 34 * 1em);
  height: calc(40 / 34 * 1em);
}

:deep(.glyph-field__cell[data-banda='0']) { color: var(--banda-0); }
:deep(.glyph-field__cell[data-banda='1']) { color: var(--banda-1); }
:deep(.glyph-field__cell[data-banda='2']) { color: var(--banda-2); }
:deep(.glyph-field__cell[data-banda='3']) { color: var(--banda-3); }
:deep(.glyph-field__cell[data-banda='4']) { color: var(--banda-4); }
</style>
