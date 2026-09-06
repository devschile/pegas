<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import {
  BANDAS,
  celda,
  construirGrilla,
  desplazamiento,
  estaCalada,
  type Alineacion,
  type Caja,
  type Grilla,
} from '~/utils/glyph-field';

/**
 * Campo de brackets con barrido radial, de fondo.
 *
 * Pinta en canvas y no con un `<span>` por celda. Expandido son ~4.300 celdas
 * y con DOM cada fotograma obligaba al navegador a recalcular estilo y
 * repintar las 4.300: medido con 4x de CPU throttling daban 94 ms de
 * fotograma —11 fps— de los cuales solo 14 eran JS. En canvas el mismo dibujo
 * son 15 ms. No se pierde nada por el camino: la pieza ya era `aria-hidden` y
 * `user-select: none`, así que el DOM no aportaba texto ni selección.
 *
 * La rampa de tonos es la de devsChile —del acento a la tiza— y no la de la
 * pieza de referencia: tomamos el recurso, no la identidad de otra marca.
 */

const props = withDefaults(
  defineProps<{
    mirror?: boolean;
    /**
     * Ocupa todo el contenedor en vez de quedarse a un lado. Se usa cuando el
     * campo es el fondo de una banda entera y no un remate lateral.
     */
    expandir?: boolean;
    /**
     * Elementos a calar. El campo mide la caja de cada uno y no dibuja las
     * celdas que quedan detrás, así que el texto queda recortado del campo en
     * vez de taparlo. Se pasan por separado y no un contenedor: recortando el
     * bloque entero queda un rectángulo enorme y los glifos se arrinconan en
     * los bordes, que es justo lo contrario del efecto.
     */
    recorte?: HTMLElement | (HTMLElement | null)[] | null;
  }>(),
  { mirror: false, expandir: false, recorte: null },
);

const raiz = ref<HTMLCanvasElement | null>(null);

/** Se guardan para poder soltarlos: `construir` corre dentro de `onMounted`,
    fuera del contexto síncrono del setup. */
let alRedimensionar: (() => void) | null = null;
let observador: ResizeObserver | null = null;
onBeforeUnmount(() => {
  if (alRedimensionar) window.removeEventListener('resize', alRedimensionar);
  observador?.disconnect();
});

function construir(root: HTMLCanvasElement) {
  const ctx = root.getContext('2d');
  if (!ctx) return () => {};

  const alineacion: Alineacion = props.expandir ? 'centro' : props.mirror ? 'fin' : 'inicio';

  let grilla: Grilla = construirGrilla(16);
  let fs = 16;
  let tonos: string[] = [];
  /** Las celdas caladas, por índice de fila y columna. */
  let calado: boolean[][] = [];

  /**
   * Mide, dimensiona el lienzo y calcula el calado. Va junto porque las tres
   * cosas dependen del mismo layout, y se hace al montar y al redimensionar
   * —nunca por fotograma: `getBoundingClientRect` fuerza layout.
   */
  function medir() {
    const estilo = getComputedStyle(root);
    fs = parseFloat(estilo.fontSize) || 16;
    tonos = BANDAS.map(b => estilo.getPropertyValue(b).trim() || '#f2ede9');

    // Expandido el tamaño sale del contenedor; si no, de la grilla fija.
    const padre = root.parentElement;
    grilla = props.expandir
      ? construirGrilla(fs, padre?.clientWidth ?? 0, padre?.clientHeight ?? 0)
      : construirGrilla(fs);

    const dpr = window.devicePixelRatio || 1;
    root.style.width = `${grilla.ancho}px`;
    root.style.height = `${grilla.alto}px`;
    root.width = Math.round(grilla.ancho * dpr);
    root.height = Math.round(grilla.alto * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${fs}px ${estilo.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    medirCalado();
  }

  function medirCalado() {
    const objetivos = (Array.isArray(props.recorte) ? props.recorte : [props.recorte]).filter(
      Boolean,
    ) as HTMLElement[];
    if (objetivos.length === 0) {
      calado = [];
      return;
    }
    // Las cajas vienen en coordenadas de ventana, así que el origen del
    // lienzo las traduce a coordenadas locales de una sola vez.
    const origen = root.getBoundingClientRect();
    const cajas: Caja[] = objetivos.map(e => {
      const b = e.getBoundingClientRect();
      return {
        left: b.left - origen.left,
        top: b.top - origen.top,
        right: b.right - origen.left,
        bottom: b.bottom - origen.top,
      };
    });

    const { ancho: ca, alto: cl } = grilla.celda;
    calado = grilla.filas.map((cols, y) => {
      const dx = desplazamiento(cols, grilla.cols, ca, alineacion);
      const cy = (y + 0.5) * cl;
      return Array.from({ length: cols }, (_, x) => estaCalada(dx + (x + 0.5) * ca, cy, cajas));
    });
  }

  medir();
  alRedimensionar = medir;
  window.addEventListener('resize', medir);

  /*
   * Medir una sola vez al montar no alcanza: en ese momento la tipografía
   * puede no haber cargado todavía y el bloque de texto reflow-ea después,
   * con lo que el agujero queda corrido para siempre —medido, el campo salía
   * con la misma densidad de tinta encima del titulo que a los lados—. El
   * observador lo vuelve a medir cuando el contenedor cambia de caja.
   */
  const padre = root.parentElement;
  if (padre && typeof ResizeObserver !== 'undefined') {
    observador = new ResizeObserver(() => medir());
    observador.observe(padre);
  }
  document.fonts?.ready.then(medir).catch(() => {});

  return (t: number) => {
    const { ancho: ca, alto: cl } = grilla.celda;
    ctx.clearRect(0, 0, grilla.ancho, grilla.alto);

    // El estado del contexto solo se toca cuando cambia: cada asignación de
    // `fillStyle` o `globalAlpha` cuesta, y las celdas vecinas suelen
    // compartir tono y peso porque el barrido es continuo.
    let tono = '';
    let peso = -1;

    for (const [y, cols] of grilla.filas.entries()) {
      const dx = desplazamiento(cols, grilla.cols, ca, alineacion);
      const py = (y + 0.5) * cl;
      const filaCalada = calado[y];
      for (let x = 0; x < cols; x++) {
        if (filaCalada?.[x]) continue;
        const v = celda(x, y, cols, grilla.filas.length, t, props.mirror);
        const color = tonos[v.banda]!;
        if (color !== tono) ctx.fillStyle = tono = color;
        if (v.peso !== peso) ctx.globalAlpha = peso = v.peso;
        ctx.fillText(v.ch, dx + (x + 0.5) * ca, py);
      }
    }
  };
}

useAnimacionAscii(raiz, construir);
</script>

<template>
  <canvas
    ref="raiz"
    class="glyph-field"
    :class="{ 'glyph-field--mirror': mirror, 'glyph-field--expandir': expandir }"
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
  left: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.8rem, 1.4vw, 1.05rem);
  opacity: 0.55;
  pointer-events: none;
  user-select: none;

  /* Se desvanece hacia el centro. Sin esto el campo cruza por detrás del
     texto y lo vuelve ilegible: el ancho del contenido y el de los dos
     campos no caben juntos salvo en pantallas muy anchas. */
  -webkit-mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 78%);
  mask-image: linear-gradient(to right, #000 0%, #000 35%, transparent 78%);

  /* La rampa la lee el componente de estas propiedades, no el navegador: en
     canvas no hay un nodo por celda al que aplicarle una regla. Siguen acá
     para que la página pueda cambiarlas sin tocar el JS. */
  --banda-0: var(--pub-verde, #3ecf8e);
  --banda-1: var(--pub-azul, #4aa8ff);
  --banda-2: var(--pub-vermellon, #ff6a45);
  --banda-3: var(--pub-ambar, #ffc247);
  --banda-4: var(--pub-tiza, #f2ede9);
}

/* Expandido no se enmascara: es el fondo de la banda, no un remate lateral. */
.glyph-field--expandir {
  left: 50%;
  transform: translate(-50%, -50%);
  -webkit-mask-image: none;
  mask-image: none;
  opacity: 0.4;
}

.glyph-field--mirror {
  left: auto;
  right: 0;
  -webkit-mask-image: linear-gradient(to left, #000 0%, #000 35%, transparent 78%);
  mask-image: linear-gradient(to left, #000 0%, #000 35%, transparent 78%);
}

/* Solo cuando de verdad sobra ancho a los lados del contenido. Debajo de eso
   el campo quedaria detras del texto, que es peor que no tenerlo. */
@media (min-width: 1000px) {
  .glyph-field {
    display: block;
  }
}

/* El expandido sí se muestra siempre: al ser el fondo de la banda no compite
   con el texto, que va calado encima. */
.glyph-field--expandir {
  display: block;
}
</style>
