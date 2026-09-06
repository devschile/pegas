<script setup lang="ts">
import { ref } from 'vue';

/**
 * Marquesina de terminal: varios carriles independientes, cada uno con un
 * cabezal que avanza dejando estela.
 *
 * Portada de la pieza de referencia de `design/`. En cada carril el cabezal va
 * en video inverso, justo detrás hay unas celdas de ruido que "se resisten"
 * —como un split-flap que todavía no se asienta— y más atrás queda el texto
 * ya legible. Cada carril corre a distinta velocidad, que es lo que evita que
 * se lea como una sola barra.
 *
 * Las palabras son las de la oferta y no relleno: la pieza decora y de paso
 * repite lo que se está vendiendo.
 */

const raiz = ref<HTMLElement | null>(null);

const PALABRAS = [
  '970×90', 'SIN TRACKERS', '150 KB', 'HTML PROPIO', 'SIN COOKIES',
  '4 ESPACIOS', 'IMPRESIONES', 'RESPONSIVE', 'CLICKS EN EL SERVIDOR',
  'LO DISEÑAMOS CONTIGO', 'DEVSCHILE', 'SIN SUBASTAS',
];

const RUIDO = '‹›{}[]()/\\|+*=-_.:0123456789';

/** Velocidad en celdas por segundo; distintas para que no se sincronicen. */
const CARRILES = [
  { velocidad: 34, tono: 'var(--pub-verde)', tinta: '#052014', alterno: 'var(--pub-ambar)' },
  { velocidad: 21, tono: 'var(--pub-azul)', tinta: '#04182e', alterno: 'var(--pub-tiza)' },
  { velocidad: 47, tono: 'var(--pub-vermellon)', tinta: '#2b0a02', alterno: 'var(--pub-ambar)' },
  { velocidad: 28, tono: 'var(--pub-ambar)', tinta: '#2a1a00', alterno: 'var(--pub-verde)' },
];

const mod = (a: number, n: number) => ((a % n) + n) % n;
const ruidoEn = (i: number, t: number) => RUIDO.charAt(mod(Math.floor(t / 120) + i * 7, RUIDO.length));
const escapar = (c: string) => (c === '<' ? '&lt;' : c === '&' ? '&amp;' : c);

function construir(root: HTMLElement) {
  const carriles = [...root.querySelectorAll<HTMLElement>('[data-carril]')];

  /** Cuántas celdas entran y qué texto las llena; se recalcula al redimensionar. */
  const medidas = carriles.map(() => ({ celdas: 0, texto: '' }));

  function medir() {
    carriles.forEach((el, i) => {
      const fs = parseFloat(getComputedStyle(el).fontSize) || 13;
      // Un carácter monoespaciado mide ~0.62em de ancho.
      const celdas = Math.max(20, Math.floor(el.clientWidth / (fs * 0.62)));
      let texto = '';
      let j = i;
      while (texto.length < celdas * 2) texto += ` ${PALABRAS[mod(j++, PALABRAS.length)]} ·`;
      medidas[i] = { celdas, texto };
    });
  }
  medir();
  window.addEventListener('resize', medir);

  // Repintar el innerHTML de cuatro carriles a 60 fps es caro y no se nota:
  // a ~20 fps el efecto de terminal se ve igual y cuesta un tercio.
  //
  // Arranca en -Infinity y no en 0 para que el primer fotograma siempre pinte:
  // con prefers-reduced-motion ese es el UNICO que se llama, y con el umbral
  // partiendo de cero la marquesina quedaba en blanco para quien pidio menos
  // movimiento.
  let ultimo = Number.NEGATIVE_INFINITY;

  return (t: number) => {
    if (t - ultimo < 50) return;
    ultimo = t;

    carriles.forEach((el, idx) => {
      const { celdas, texto } = medidas[idx]!;
      if (!celdas) return;
      const cabezal = (t / 1000) * CARRILES[idx]!.velocidad;
      const desfase = Math.floor(cabezal);
      let salida = '';
      let abierto: string | null = null;

      for (let i = 0; i < celdas; i++) {
        const edad = mod(cabezal - i, celdas * 1.6);
        let ch: string;
        let tag: string;

        if (edad < 1) {
          ch = ruidoEn(i + desfase, t);
          tag = 'b'; // cabezal, en video inverso
        } else if (edad < 4) {
          ch = ruidoEn(i * 3 + desfase, t);
          tag = 'u'; // todavía asentándose
        } else if (edad < celdas) {
          ch = texto.charAt(mod(i - desfase, texto.length));
          tag = ''; // estela ya legible
        } else {
          ch = ruidoEn(i, t);
          tag = 'i'; // apagado
        }

        if (tag !== abierto) {
          if (abierto) salida += `</${abierto}>`;
          if (tag) salida += `<${tag}>`;
          abierto = tag;
        }
        salida += escapar(ch);
      }
      if (abierto) salida += `</${abierto}>`;
      // El contenido lo genera este componente, no viene de fuera.
      el.innerHTML = salida;
    });
  };
}

useAnimacionAscii(raiz, construir);
</script>

<template>
  <div ref="raiz" class="marquesina" aria-hidden="true">
    <div
      v-for="(c, i) in CARRILES"
      :key="i"
      class="marquesina__carril"
      data-carril
      :style="{ '--carril': c.tono, '--carril-tinta': c.tinta, '--carril-alt': c.alterno }"
    />
  </div>
</template>

<style scoped>
.marquesina {
  /* A todo el ancho de la ventana, no del contenedor: es un respiro entre
     secciones y necesita cortar la página de lado a lado. */
  width: 100vw;
  margin-left: calc(50% - 50vw);
  padding: 1.1rem 0;
  overflow: hidden;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.015);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  user-select: none;
}

.marquesina__carril {
  display: block;
  white-space: pre;
  font-size: clamp(0.68rem, 1.3vw, 0.9rem);
  line-height: 1.5;
  letter-spacing: 0.04em;
  color: var(--carril);
}

/* Cabezal: video inverso. */
.marquesina__carril :deep(b) {
  font-weight: 400;
  background: var(--carril);
  color: var(--carril-tinta);
}

/* Todavía asentándose. */
.marquesina__carril :deep(u) {
  text-decoration: none;
  color: var(--carril-alt);
}

/* Apagado, lejos del cabezal. */
.marquesina__carril :deep(i) {
  font-style: normal;
  opacity: 0.28;
}
</style>
