<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { construirSrcdoc, parsearMensajeDelAd, type Tema } from '~/utils/ads-iframe';

/**
 * Un espacio publicitario. Renderiza el ad que le toca a esa ubicación, o nada
 * si no hay ninguno.
 *
 * Los ads de imagen se renderizan en la página; los de HTML van dentro de un
 * iframe con sandbox, porque traen JS del anunciante y el aislamiento lo da el
 * iframe, no un saneo. Ver `utils/ads-iframe.ts`.
 */

interface AdPublico {
  id: number;
  formato: 'imagen' | 'html';
  imagen_desktop_url: string | null;
  imagen_movil_url: string | null;
  alt: string | null;
  html: string | null;
  alto_desktop: number | null;
  alto_movil: number | null;
  link: string | null;
  empresa_nombre: string;
  es_casa: boolean;
}

const props = defineProps<{
  ad: AdPublico | null;
  ubicacion: 'header' | 'listado' | 'footer';
  posicion?: number | null;
  pagina?: number | null;
}>();

const raiz = ref<HTMLElement | null>(null);
const marco = ref<HTMLIFrameElement | null>(null);
const track = useTrackEvent();
const { registrar } = useAdEventos();

/** Alto reservado antes de que el ad diga cuánto mide, para no causar saltos. */
const alto = ref(props.ad?.alto_desktop ?? 90);

const dispositivo = () =>
  import.meta.client && window.matchMedia('(max-width: 640px)').matches ? 'movil' : 'desktop';

const dimensiones = () => ({
  ubicacion: props.ubicacion,
  dispositivo: dispositivo(),
  ...(props.ubicacion === 'listado' ? { posicion: props.posicion ?? null, pagina: props.pagina ?? null } : {}),
});

/**
 * El destino de un ad de imagen pasa por nuestro endpoint, que cuenta y
 * redirige. El conteo así es inmune a los bloqueadores de publicidad, que es
 * lo que permite mostrarle a un anunciante un número defendible.
 */
const hrefImagen = computed(() => {
  if (!props.ad) return '#';
  const d = dimensiones();
  const qs = new URLSearchParams({ ubicacion: d.ubicacion, dispositivo: d.dispositivo });
  if (d.posicion != null) qs.set('posicion', String(d.posicion));
  if (d.pagina != null) qs.set('pagina', String(d.pagina));
  return `/api/ads/${props.ad.id}/click?${qs}`;
});

const temaActual = (): Tema =>
  import.meta.client && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

const srcdoc = computed(() =>
  props.ad?.formato === 'html' && props.ad.html
    ? construirSrcdoc(props.ad.html, props.ad.id, temaActual())
    : '',
);

/**
 * Una impresión es que el ad haya ENTRADO en pantalla, no que se haya
 * renderizado: un banner en el pie que nadie scrolleó no es una impresión.
 * Se cuenta una sola vez por carga.
 */
let observer: IntersectionObserver | null = null;
let yaContada = false;

function observarImpresion() {
  if (!import.meta.client || !raiz.value || !props.ad || typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver(
    entradas => {
      if (yaContada || !entradas.some(e => e.isIntersecting)) return;
      yaContada = true;
      observer?.disconnect();
      const ad = props.ad!;
      registrar(ad.id, 'impresion', dimensiones());
      track('ad_impresion', { ad: ad.id, ubicacion: props.ubicacion, empresa: ad.empresa_nombre });
    },
    { threshold: 0.5 },
  );
  observer.observe(raiz.value);
}

/**
 * Mensajes desde el iframe. El origen no sirve para validar: un sandbox sin
 * `allow-same-origin` reporta "null" igual que cualquier frame opaco de la
 * página. Lo que identifica al emisor es que `event.source` sea el
 * `contentWindow` de NUESTRO iframe.
 */
function alRecibirMensaje(e: MessageEvent) {
  if (!marco.value || e.source !== marco.value.contentWindow) return;
  const msg = parsearMensajeDelAd(e.data);
  if (!msg || !props.ad || msg.id !== props.ad.id) return;

  if (msg.tipo === 'alto' && msg.alto) {
    alto.value = msg.alto;
    return;
  }

  if (msg.tipo === 'click' && msg.href) {
    // El href viene de dentro del iframe, así que se valida el protocolo antes
    // de abrirlo: `javascript:` en un window.open sigue siendo ejecución.
    let destino: URL;
    try {
      destino = new URL(msg.href);
    } catch {
      return;
    }
    if (destino.protocol !== 'http:' && destino.protocol !== 'https:') return;

    registrar(props.ad.id, 'click', dimensiones());
    track('ad_click', { ad: props.ad.id, ubicacion: props.ubicacion, empresa: props.ad.empresa_nombre });
    window.open(destino.toString(), '_blank', 'noopener,noreferrer');
  }
}

/** El tema viaja por mensaje: rearmar el srcdoc recargaría el iframe. */
let mediaTema: MediaQueryList | null = null;
function avisarTema() {
  marco.value?.contentWindow?.postMessage({ fuente: 'pegas-host', tema: temaActual() }, '*');
}

onMounted(() => {
  observarImpresion();
  window.addEventListener('message', alRecibirMensaje);
  mediaTema = window.matchMedia('(prefers-color-scheme: light)');
  mediaTema.addEventListener?.('change', avisarTema);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener('message', alRecibirMensaje);
  mediaTema?.removeEventListener?.('change', avisarTema);
});

watch(() => props.ad?.id, () => {
  yaContada = false;
  alto.value = props.ad?.alto_desktop ?? 90;
  observer?.disconnect();
  observarImpresion();
});
</script>

<template>
  <aside
    v-if="ad"
    ref="raiz"
    class="ad-slot"
    :class="`ad-slot--${ubicacion}`"
    aria-label="Publicidad"
  >
    <iframe
      v-if="ad.formato === 'html'"
      ref="marco"
      class="ad-slot__marco"
      title="Publicidad"
      loading="lazy"
      scrolling="no"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      :srcdoc="srcdoc"
      :style="{ height: `${alto}px` }"
      @load="avisarTema"
    />

    <a
      v-else
      class="ad-slot__enlace"
      :href="hrefImagen"
      target="_blank"
      rel="noopener noreferrer sponsored"
    >
      <picture>
        <source v-if="ad.imagen_movil_url" media="(max-width: 640px)" :srcset="ad.imagen_movil_url" />
        <img :src="ad.imagen_desktop_url ?? ''" :alt="ad.alt ?? ''" loading="lazy" decoding="async" />
      </picture>
    </a>

    <span class="ad-slot__sello">{{ ad.es_casa ? 'Espacio disponible' : `Publicidad · ${ad.empresa_nombre}` }}</span>
  </aside>
</template>


<style scoped>
.ad-slot {
  position: relative;
  display: block;
  width: 100%;
}

.ad-slot--header {
  margin: 0 0 0.5rem;
}

.ad-slot--listado,
.ad-slot--footer {
  margin: 1.5rem 0;
}

.ad-slot__marco {
  display: block;
  width: 100%;
  border: 0;
  /* El alto lo fija el estilo inline; la transición evita el salto brusco
     cuando el ad reporta que mide distinto a lo reservado. */
  transition: height 0.15s ease;
}

.ad-slot__enlace {
  display: block;
  line-height: 0;
}

.ad-slot__enlace img {
  display: block;
  width: 100%;
  height: auto;
}

/* Declarar que es publicidad es una obligación, no un adorno: va visible,
   pequeño y sin taparse con el contenido del ad. */
.ad-slot__sello {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.6rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted, #666);
  text-align: right;
}
</style>
