import { onBeforeUnmount, onMounted, type Ref } from 'vue';

/**
 * Motor compartido de las piezas ASCII animadas.
 *
 * Todas necesitan lo mismo: un `requestAnimationFrame`, pausarlo cuando el
 * elemento sale de pantalla —un rAF invisible es batería regalada— y no
 * animar nada si la persona pidió menos movimiento. Estaba escrito dentro de
 * `GlyphField`; vive acá para que la siguiente pieza no lo copie.
 *
 * `pintar` recibe los milisegundos transcurridos desde que arrancó. Se llama
 * una vez de inmediato para que el primer fotograma exista aunque la
 * animación esté desactivada.
 */
export function useAnimacionAscii<T extends HTMLElement>(
  elemento: Ref<T | null>,
  preparar: (root: T) => (t: number) => void,
) {
  let raf = 0;
  let observer: IntersectionObserver | null = null;
  let reduce: MediaQueryList | null = null;
  let pintar: ((t: number) => void) | null = null;
  let visible = true;
  let inicio = 0;

  function tick(ahora: number) {
    pintar?.(ahora - inicio);
    raf = requestAnimationFrame(tick);
  }

  function arrancar() {
    if (raf || !visible || reduce?.matches || !pintar) return;
    inicio = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function detener() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  onMounted(() => {
    if (!elemento.value) return;
    pintar = preparar(elemento.value);
    pintar(0);

    reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduce.addEventListener?.('change', () => (reduce!.matches ? detener() : arrancar()));

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        e => {
          visible = e[0]?.isIntersecting ?? false;
          if (visible) arrancar();
          else detener();
        },
        { rootMargin: '80px' },
      );
      observer.observe(elemento.value);
    }
    arrancar();
  });

  onBeforeUnmount(() => {
    detener();
    observer?.disconnect();
  });

  return { arrancar, detener };
}
