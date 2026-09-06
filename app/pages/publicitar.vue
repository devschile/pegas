<script setup lang="ts">
import { IconArrowLeft, IconArrowUpRight } from '@tabler/icons-vue';
import { computed, ref } from 'vue';

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

/**
 * Cada pieza del cierre se cala por separado del campo que tiene detrás. Si se
 * recortara el bloque entero quedaría un rectángulo enorme y los glifos se
 * arrinconarían en los bordes.
 */
const caladoTitulo = ref<HTMLElement | null>(null);
const caladoBajada = ref<HTMLElement | null>(null);
const caladoPrueba = ref<HTMLElement | null>(null);
const caladoBoton = ref<HTMLElement | null>(null);
const calados = computed(() => [caladoTitulo.value, caladoBajada.value, caladoPrueba.value, caladoBoton.value]);

/** El esquema resalta la ubicación que se está mirando. */
const resaltada = ref<'header' | 'listado' | 'footer' | 'pega' | null>(null);

const ubicaciones = [
  {
    id: 'header' as const,
    n: '01',
    titulo: 'Cabecera',
    donde: 'A todo el ancho, antes que todo. Es lo primero que se ve al entrar, y está en todas las páginas.',
    medidas: 'escritorio 970 × 90–200 · móvil 320 × 100–200',
  },
  {
    id: 'listado' as const,
    n: '02',
    titulo: 'Entre las pegas',
    donde: 'Intercalado entre las tarjetas, en una posición fija por página. Se ve mientras la persona busca, que es cuando está más atenta.',
    medidas: 'escritorio 970 × 90–200 · móvil 320 × 100–200',
  },
  {
    id: 'footer' as const,
    n: '03',
    titulo: 'Pie',
    donde: 'Al ancho del contenido, después del listado. Lo ve quien busca navegar.',
    medidas: 'escritorio 970 × 90–200 · móvil 320 × 100–200',
  },
  {
    id: 'pega' as const,
    n: '04',
    titulo: 'En el aviso',
    donde: 'Otra pantalla: la página de cada pega, debajo del aviso. Va después y no antes, porque quien llega ahí vino a leer algo concreto. Puedes tener exclusividad, solo con tu aviso.',
    medidas: 'escritorio 970 × 90–200 · móvil 320 × 100–200',
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
    <GlyphButton class="pub__volver" variant="sutil" @click="$router.push('/')">
      <IconArrowLeft :size="16" aria-hidden="true" /> Volver
    </GlyphButton>

    <header class="pub__hero">
      <GlyphField />
      <GlyphField mirror />
      <div class="pub__hero-inner">
        <p class="pub__eyebrow">espacios disponibles</p>
        <h1 class="pub__titulo">Tu marca, frente a la comunidad de programadores de Chile.</h1>
        <p class="pub__bajada">
          <strong>Pegas devsChile</strong> es la vitrina de trabajos de la comunidad devsChile.
          Quien entra está buscando pega o mirando el mercado. Si es a esos profesionales a quien quieres
          llegar, acá tienes tres espacios.
        </p>
        <GlyphButton :href="mailto">
          Hablemos <IconArrowUpRight :size="16" aria-hidden="true" />
        </GlyphButton>
      </div>
    </header>

    <section class="pub__seccion">
      <p class="pub__eyebrow">dónde</p>
      <div class="pub__donde">
        <!-- Esquema del sitio: se entiende mucho más rápido que describirlo. -->
        <div class="pub__esquema" aria-hidden="true">
          <div class="pub__slot" :class="{ 'pub__slot--on': resaltada === 'header' }">
            <AsciiFill :activo="resaltada === 'header'" />
            <span>cabecera</span>
          </div>
          <div class="pub__barra" />
          <div class="pub__card" />
          <div class="pub__card" />
          <div class="pub__slot" :class="{ 'pub__slot--on': resaltada === 'listado' }">
            <AsciiFill :activo="resaltada === 'listado'" />
            <span>entre las pegas</span>
          </div>
          <div class="pub__card" />
          <div class="pub__card" />
          <div class="pub__slot" :class="{ 'pub__slot--on': resaltada === 'footer' }">
            <AsciiFill :activo="resaltada === 'footer'" />
            <span>pie</span>
          </div>
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

    <section class="pub__seccion pub__seccion--tras-marquesina">
      <p class="pub__eyebrow">cómo</p>
      <div class="pub__dos">
        <article class="pub__caja">
          <h2>Una imagen</h2>
          <p>
            Utilizamos dos versiones, escritorio y móvil, más el link de destino. Pedimos las dos
            porque una sola se ve rota en la mitad del tráfico.
          </p>
          <p class="pub__mono">PNG · JPEG · GIF · WebP — hasta 150 KB</p>
        </article>
        <article class="pub__caja">
          <h2>Tu propio HTML</h2>
          <p>
            Si tienes una pieza hecha, con su CSS y su animación, la corremos tal cual: nadie te
            la reescribe ni te la pasa por un comité. Va en su propio entorno, así que se ve igual
            acá que en tu maqueta y nada del sitio puede interferirla.
          </p>
          <p class="pub__mono">hasta 200 px de alto · 100 KB — responsive</p>
        </article>
      </div>
    </section>

    <TerminalMarquee class="pub__marquesina" />

    <section class="pub__seccion">
      <p class="pub__eyebrow">qué recibes</p>
      <div class="pub__tres">
        <article class="pub__caja">
          <h2>Números que aguantan</h2>
          <p>
            Contamos impresiones y clicks <strong>en nuestro servidor</strong>, no con un analytics
            que los bloqueadores tumban. Y te decimos cuándo la muestra todavía no da para sacar
            conclusiones.
          </p>
        </article>
        <article class="pub__caja">
          <h2>Una audiencia que no te bloquea</h2>
          <p>
            Sin scripts de terceros, sin píxeles, sin cookies. Resignas tu propio conteo y usas el
            nuestro; a cambio tu marca llega entera a gente que tiene bloqueado a todo el resto.
          </p>
        </article>
        <article class="pub__caja">
          <h2>Lo diseñamos contigo</h2>
          <p>
            Si tu pieza no entra en esos límites, la rehacemos juntos y sin costo, hasta que pese
            poco y se vea como algo que un programador querría mirar.
          </p>
        </article>
      </div>
    </section>

    <section class="pub__cierre">
      <!-- El campo llena la banda entera y el bloque va calado encima: los
           glifos siguen animandose hasta el borde mismo del texto. -->
      <GlyphField expandir :recorte="calados" />
      <div class="pub__hero-inner">
        <h2 ref="caladoTitulo" class="pub__titulo pub__titulo--chico">¿Quieres saber más?</h2>
        <p ref="caladoBajada" class="pub__bajada">
          Los valores dependen de la ubicación y del tiempo, así que los conversamos directo.
          Cuéntanos qué espacio te interesa y para cuándo.
        </p>
        <p ref="caladoPrueba" class="pub__prueba">Tenemos evaluación y prueba gratuita 👀</p>
        <div ref="caladoBoton" class="pub__cta">
          <GlyphButton :href="mailto">
            Escríbenos a {{ CONTACTO }} <IconArrowUpRight :size="16" aria-hidden="true" />
          </GlyphButton>
        </div>
      </div>
    </section>

    <div class="pub__firma">
      <StackedWordmark :lineas="['devs', 'Chile']" />
    </div>
  </div>
</template>

<style scoped>
/*
 * Paleta propia de esta página. Los tonos vienen de la pieza de referencia de
 * `design/` —su verde es más cálido que el teal de chucao y se lee mejor sobre
 * este fondo— y no se tocan los tokens globales: el resto del sitio sigue con
 * su acento.
 *
 * El ámbar es el color de acción: botones y remates. El verde acompaña. Con un
 * solo tono la página quedaba duotono y no llamaba la atención de nada, que es
 * justo lo contrario de lo que necesita una landing de venta.
 *
 * Cada color de acción necesita su tinta —el texto que va encima cuando el
 * botón se rellena—, así que las dos variables viajan juntas.
 */
.pub {
  --pub-verde: #3ecf8e;
  --pub-azul: #4aa8ff;
  --pub-vermellon: #ff6a45;
  --pub-ambar: #ffc247;
  --pub-tiza: #f2ede9;
  --pub-accion: var(--pub-ambar);
  --pub-accion-tinta: #2a1a00;
}

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
  color: var(--pub-verde);
}

/* Cada sección con su tono: es lo que rompe el duotono sin recargar. */
.pub__seccion:nth-of-type(2) .pub__eyebrow { color: var(--pub-azul); }
.pub__seccion:nth-of-type(3) .pub__eyebrow { color: var(--pub-vermellon); }

.pub__mono {
  text-transform: none;
  letter-spacing: 0.04em;
  color: var(--text-muted, #888);
}

.pub__titulo {
  /* En sans: la mono ya la ocupan las etiquetas y los brackets del fondo, y
     con las tres cosas en monoespaciada el hero competia consigo mismo. */
  font-family: var(--font-body);
  font-size: clamp(2rem, 4.2vw, 3.1rem);
  font-weight: var(--typography-weight-bold, 700);
  letter-spacing: -0.03em;
  line-height: 1.08;
  margin: 1rem auto 1.5rem;
  /* Suficiente para que entre en dos líneas: a 20ch cortaba en tres y el
     bloque quedaba angosto y alto. */
  max-width: 30ch;
  text-wrap: balance;
}

.pub__titulo--chico {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
}

/* El nombre del sitio, destacado: es lo primero que tiene que quedar claro. */
.pub__bajada strong {
  color: var(--pub-verde);
  font-weight: var(--typography-weight-bold, 700);
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
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  /* A todo el ancho de la ventana: el cierre es el climax y no puede quedar
     encajonado en el contenedor. */
  width: 100vw;
  margin-left: calc(50% - 50vw);
  padding: clamp(5rem, 12vw, 9rem) 1.5rem;
}

.pub__prueba {
  margin: 0 0 1.75rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  color: var(--pub-verde);
}

/* La firma cierra la pagina: va sola, con aire alrededor. */
.pub__cta {
  display: inline-flex;
}

.pub__firma {
  display: flex;
  justify-content: center;
  padding: clamp(3rem, 7vw, 5rem) 0 clamp(1rem, 3vw, 2rem);
}

.pub__hero-inner {
  position: relative;
  z-index: 10;
  max-width: 54rem;
}

/* --- secciones ------------------------------------------------------------ */
.pub__seccion {
  margin-top: clamp(4rem, 8vw, 7rem);
}

.pub__marquesina {
  margin-top: clamp(4rem, 8vw, 7rem);
}

/* La marquesina ya separa: la sección que la sigue no necesita repetirlo. */
.pub__seccion--tras-marquesina {
  margin-top: clamp(2.5rem, 5vw, 4rem);
}

.pub__seccion h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-body);
  font-size: 1.15rem;
  margin: 0 0 0.5rem;
}

/* Los títulos de las ubicaciones toman el color de acción y crecen al
   mirarlos: es lo que conecta la lista con el espacio que se ilumina. */
.pub__item h2 {
  font-size: 1.35rem;
  color: var(--pub-accion);
  transition: color 0.2s ease;
}

.pub__item:hover h2,
.pub__item:focus-within h2 {
  color: var(--pub-tiza);
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
    grid-template-columns: minmax(320px, 400px) 1fr;
    gap: 4rem;
    align-items: start;
  }
}

.pub__esquema {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 0.8rem;
  background: rgba(255, 255, 255, 0.025);
  position: sticky;
  top: 1.5rem;
}

.pub__barra {
  height: 1rem;
  border-radius: 0.2rem;
  background: rgba(255, 255, 255, 0.07);
}

.pub__card {
  height: 2.6rem;
  border-radius: 0.3rem;
  background: rgba(255, 255, 255, 0.045);
}

.pub__slot {
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  overflow: hidden;
  height: 2.6rem;
  border: 1px dashed color-mix(in srgb, var(--pub-accion) 55%, transparent);
  border-radius: 0.35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: var(--pub-accion);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.pub__slot span {
  position: relative;
  z-index: 1;
}

.pub__slot--on {
  border-color: var(--pub-accion);
  border-style: solid;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pub-accion) 12%, transparent);
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

.pub__tres {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

@media (min-width: 900px) {
  .pub__tres {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
}

.pub__caja {
  display: flex;
  flex-direction: column;
  padding: 2rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
  border-radius: 0.6rem;
  background: rgba(255, 255, 255, 0.02);
}

/* El título de una caja no lleva icono: a este ancho el icono se comía la
   primera línea y no agregaba nada que el título no dijera. */
.pub__caja h2 {
  color: var(--pub-tiza);
  margin-bottom: 0.75rem;
}

.pub__caja p:last-child {
  margin-bottom: 0;
}
</style>
