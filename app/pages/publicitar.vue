<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import { IconArrowLeft, IconArrowUpRight, IconChartBar, IconShieldCheck } from '@tabler/icons-vue';
import { ref } from 'vue';

/**
 * Página de venta de los espacios publicitarios.
 *
 * Es una página y no un formulario a propósito: para B2B, responder "qué me
 * llevo y cómo se ve" convierte mejor que pedir datos antes de explicar nada,
 * y no agrega superficie de spam ni infraestructura.
 *
 * ⚠️ Acá NO van precios. Una tarifa cambia cuando se renegocia un acuerdo, y
 * este repositorio es público: por eso los valores se conversan por correo.
 * Ver la regla en AGENTS.md.
 */

/**
 * Sin el marco del sitio: el encabezado con el conteo de pegas competiría con
 * el hero de esta página, y no tiene sentido ocupar con publicidad la página
 * que vende esos mismos espacios.
 */
definePageMeta({ marco: false, ancho: 'amplio' });

// TODO: reemplazar por la dirección real de contacto comercial.
const CONTACTO = 'hola@devschile.cl';

const asunto = encodeURIComponent('Publicidad en pegas.devschile.cl');
const cuerpo = encodeURIComponent(
  'Hola:\n\nMe interesa publicitar en pegas.devschile.cl.\n\n' +
    '- Empresa:\n- Ubicación que me interesa:\n- Fechas:\n\nGracias.',
);
const mailto = `mailto:${CONTACTO}?subject=${asunto}&body=${cuerpo}`;

/** El esquema resalta la ubicación que se está mirando. */
const resaltada = ref<'header' | 'listado' | 'footer' | null>(null);

const ubicaciones = [
  {
    id: 'header' as const,
    n: '01',
    titulo: 'Cabecera',
    donde: 'A todo el ancho, arriba de todo. Es lo primero que se ve al entrar, y está en todas las páginas.',
    medidas: '970 × 90 escritorio · 320 × 100 móvil',
  },
  {
    id: 'listado' as const,
    n: '02',
    titulo: 'Entre las pegas',
    donde: 'Intercalado entre las tarjetas, en una posición fija por página. Se ve mientras la persona busca, que es cuando está más atenta.',
    medidas: '970 × 90 escritorio · 320 × 100 móvil',
  },
  {
    id: 'footer' as const,
    n: '03',
    titulo: 'Pie',
    donde: 'Al ancho del contenido, después del listado. Lo ve quien recorrió la página entera.',
    medidas: '970 × 90 escritorio · 320 × 100 móvil',
  },
];

useSeoMeta({
  title: 'Publicita en pegas',
  description:
    'Espacios publicitarios en pegas.devschile.cl: cabecera, entre las pegas y pie. Formato imagen o HTML propio, con métricas de impresiones y clicks contadas en el servidor.',
});
</script>

<template>
  <div class="pub">
    <ChButton class="pub__volver" variant="secondary" @ch-click="$router.push('/')">
      <IconArrowLeft :size="16" aria-hidden="true" /> Volver
    </ChButton>

    <header class="pub__hero">
      <GlyphField />
      <GlyphField mirror />
      <div class="pub__hero-inner">
        <p class="pub__eyebrow">espacios disponibles</p>
        <h1 class="pub__titulo">Tu marca, frente a quien programa en Chile.</h1>
        <p class="pub__bajada">
          <strong>Pegas devsChile</strong> es la vitrina de trabajos de la comunidad devsChile.
          Quien entra está buscando pega o mirando el mercado. Si es a esos profesionales a quien quieres
          llegar, acá tienes tres espacios.
        </p>
        <ChButton :href="mailto">
          Hablemos <IconArrowUpRight :size="16" aria-hidden="true" />
        </ChButton>
      </div>
    </header>

    <section class="pub__seccion">
      <p class="pub__eyebrow">dónde</p>
      <div class="pub__donde">
        <!-- Esquema del sitio: se entiende mucho más rápido que describirlo. -->
        <div class="pub__esquema" aria-hidden="true">
          <div class="pub__slot" :class="{ 'pub__slot--on': resaltada === 'header' }">cabecera</div>
          <div class="pub__barra" />
          <div class="pub__card" />
          <div class="pub__card" />
          <div class="pub__slot" :class="{ 'pub__slot--on': resaltada === 'listado' }">entre las pegas</div>
          <div class="pub__card" />
          <div class="pub__card" />
          <div class="pub__slot" :class="{ 'pub__slot--on': resaltada === 'footer' }">pie</div>
        </div>

        <ol class="pub__lista">
          <li
            v-for="u in ubicaciones"
            :key="u.id"
            class="pub__item"
            @mouseenter="resaltada = u.id"
            @mouseleave="resaltada = null"
            @focusin="resaltada = u.id"
            @focusout="resaltada = null"
          >
            <span class="pub__n">{{ u.n }}</span>
            <div>
              <h2>{{ u.titulo }}</h2>
              <p>{{ u.donde }}</p>
              <p class="pub__mono">{{ u.medidas }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <section class="pub__seccion">
      <p class="pub__eyebrow">cómo</p>
      <div class="pub__dos">
        <article class="pub__caja">
          <h2>Una imagen</h2>
          <p>
            Nos mandas dos versiones, escritorio y móvil, más el link de destino. Pedimos las dos
            porque una sola se ve rota en la mitad del tráfico.
          </p>
          <p class="pub__mono">PNG · JPEG · GIF · WebP — hasta 2 MB</p>
        </article>
        <article class="pub__caja">
          <h2>Tu propio HTML</h2>
          <p>
            Si tienes una pieza hecha, con su CSS y su animación, la corremos tal cual. Se sirve
            aislada del sitio: no puede tocar la página ni a quien la visita —y por lo mismo
            tampoco puede cargar trackers de terceros.
          </p>
          <p class="pub__mono">hasta 600 px de alto — responsive</p>
        </article>
      </div>
    </section>

    <section class="pub__seccion">
      <p class="pub__eyebrow">qué recibes</p>
      <div class="pub__dos">
        <article class="pub__caja">
          <h2><IconChartBar :size="18" aria-hidden="true" /> Números que aguantan</h2>
          <p>
            Contamos impresiones y clicks <strong>en el servidor</strong>, no con un analytics que
            los bloqueadores de publicidad tumban. Te pasamos las cifras con su tamaño de muestra
            al lado: si todavía no alcanza para concluir nada, lo decimos.
          </p>
        </article>
        <article class="pub__caja">
          <h2><IconShieldCheck :size="18" aria-hidden="true" /> Sin perseguir a nadie</h2>
          <p>
            No usamos cookies de seguimiento ni perfilamos visitantes. Registramos si el aviso
            entró en pantalla y si alguien hizo click, nada más. Tu marca no aparece al lado de
            prácticas que a esta comunidad no le gustan.
          </p>
        </article>
      </div>
    </section>

    <section class="pub__cierre">
      <GlyphField mirror />
      <div class="pub__hero-inner">
        <h2 class="pub__titulo pub__titulo--chico">Hablemos</h2>
        <p class="pub__bajada">
          Los valores dependen de la ubicación y del tiempo, así que los conversamos directo.
          Cuéntanos qué espacio te interesa y para cuándo.
        </p>
        <ChButton :href="mailto">
          Escribir a {{ CONTACTO }} <IconArrowUpRight :size="16" aria-hidden="true" />
        </ChButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pub__volver {
  display: inline-block;
  margin-bottom: 1rem;
}

/* --- tipografía compartida ------------------------------------------------ */
.pub__eyebrow,
.pub__mono,
.pub__n {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.pub__mono {
  text-transform: none;
  letter-spacing: 0.04em;
  color: var(--text-muted, #888);
}

.pub__titulo {
  /* En sans: la mono ya la ocupan las etiquetas y los brackets del fondo, y
     con las tres cosas en monoespaciada el hero competia consigo mismo. */
  font-family: var(--font-body);
  font-size: clamp(2.1rem, 5vw, 3.6rem);
  font-weight: var(--typography-weight-bold, 700);
  letter-spacing: -0.03em;
  line-height: 1.06;
  margin: 1rem auto 1.5rem;
  max-width: 20ch;
  text-wrap: balance;
}

.pub__titulo--chico {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
}

.pub__bajada {
  margin: 0 auto 2rem;
  /* Mas ancha que antes para que el bloque se lea como una unidad y no como
     una columna angosta debajo de un titulo enorme. */
  max-width: 58ch;
  color: var(--text-muted, #888);
  font-size: 1.05rem;
  line-height: 1.7;
  text-wrap: pretty;
}

/* --- hero ----------------------------------------------------------------- */
.pub__hero,
.pub__cierre {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: grid;
  place-items: center;
  text-align: center;
  padding: clamp(4rem, 11vw, 8rem) 1rem;
  margin: 0 -1.5rem;
}

.pub__cierre {
  margin-top: clamp(4rem, 8vw, 7rem);
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.pub__hero-inner {
  position: relative;
  z-index: 10;
  max-width: 46rem;
}

/* --- secciones ------------------------------------------------------------ */
.pub__seccion {
  margin-top: clamp(4rem, 8vw, 7rem);
}

.pub__seccion h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 1.15rem;
  margin: 0 0 0.5rem;
}

.pub__seccion p {
  margin: 0 0 0.5rem;
  line-height: 1.6;
}

/* --- dónde: esquema + lista ----------------------------------------------- */
.pub__donde {
  display: grid;
  gap: 2rem;
  margin-top: 1.5rem;
}

@media (min-width: 800px) {
  .pub__donde {
    grid-template-columns: 300px 1fr;
    gap: 3.5rem;
    align-items: start;
  }
}

.pub__esquema {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.7rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.02);
  position: sticky;
  top: 1.5rem;
}

.pub__barra {
  height: 0.85rem;
  border-radius: 0.2rem;
  background: rgba(255, 255, 255, 0.07);
}

.pub__card {
  height: 2.1rem;
  border-radius: 0.3rem;
  background: rgba(255, 255, 255, 0.045);
}

.pub__slot {
  display: grid;
  place-items: center;
  height: 1.7rem;
  border: 1px dashed var(--accent);
  border-radius: 0.3rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: var(--accent);
  opacity: 0.45;
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.pub__slot--on {
  opacity: 1;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.pub__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.pub__item {
  display: grid;
  grid-template-columns: 3rem 1fr;
  gap: 0.75rem;
  padding: 1.75rem 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.07));
}

.pub__item:first-child {
  padding-top: 0;
}

.pub__n {
  opacity: 0.5;
}

/* --- cajas ---------------------------------------------------------------- */
.pub__dos {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (min-width: 720px) {
  .pub__dos {
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
}

.pub__caja {
  padding: 2rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.02);
}

.pub__caja p:last-child {
  margin-bottom: 0;
}
</style>
