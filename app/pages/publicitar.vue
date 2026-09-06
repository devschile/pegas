<script setup lang="ts">
import { ChButton, ChCard } from '@devschile/chucao/vue';
import { IconArrowLeft, IconChartBar, IconMail, IconShieldCheck } from '@tabler/icons-vue';
import { UBICACIONES } from '~/composables/useAds';

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

// TODO: reemplazar por la dirección real de contacto comercial.
const CONTACTO = 'hola@devschile.cl';

const asunto = encodeURIComponent('Publicidad en pegas.devschile.cl');
const cuerpo = encodeURIComponent(
  'Hola:\n\nMe interesa publicitar en pegas.devschile.cl.\n\n' +
    '- Empresa:\n- Ubicación que me interesa:\n- Fechas:\n\nGracias.',
);

const ubicaciones: Record<(typeof UBICACIONES)[number], { titulo: string; donde: string; medidas: string }> = {
  header: {
    titulo: 'Cabecera',
    donde: 'A todo el ancho, arriba de todo. Es lo primero que se ve al entrar, en todas las páginas.',
    medidas: '970 × 90 en escritorio · 320 × 100 en móvil',
  },
  listado: {
    titulo: 'Entre las pegas',
    donde: 'Intercalado entre las tarjetas del listado, en una posición fija por página. Se ve mientras la persona busca.',
    medidas: '970 × 90 en escritorio · 320 × 100 en móvil',
  },
  footer: {
    titulo: 'Pie',
    donde: 'Al ancho del contenido, después del listado. Lo ve quien recorrió la página entera.',
    medidas: '970 × 90 en escritorio · 320 × 100 en móvil',
  },
};

useSeoMeta({
  title: 'Publicita en pegas',
  description:
    'Espacios publicitarios en pegas.devschile.cl: cabecera, entre las pegas y pie. Formato imagen o HTML propio, con métricas de impresiones y clicks.',
});
</script>

<template>
  <div class="publicitar">
    <ChButton class="publicitar__volver" variant="secondary" @ch-click="$router.push('/')">
      <IconArrowLeft :size="16" aria-hidden="true" /> Volver
    </ChButton>

    <h1>Publicita en pegas</h1>
    <p class="publicitar__bajada">
      <strong>pegas.devschile.cl</strong> es la bolsa de trabajo tech de la comunidad devsChile.
      Quien entra está buscando pega o mirando el mercado: gente que programa, en Chile.
      Si eso es a quien quieres llegar —para contratar, o para mostrarle una herramienta—
      acá tienes tres espacios.
    </p>

    <h2>Dónde</h2>
    <div class="publicitar__grilla">
      <ChCard v-for="u in UBICACIONES" :key="u" class="publicitar__ubicacion">
        <h3>{{ ubicaciones[u].titulo }}</h3>
        <p>{{ ubicaciones[u].donde }}</p>
        <p class="publicitar__medidas">{{ ubicaciones[u].medidas }}</p>
      </ChCard>
    </div>

    <h2>Cómo</h2>
    <div class="publicitar__grilla publicitar__grilla--dos">
      <ChCard>
        <h3>Una imagen</h3>
        <p>
          Nos mandas dos versiones, escritorio y móvil, más el link de destino. Pedimos las dos
          porque una sola se ve rota en la mitad del tráfico.
        </p>
        <p class="publicitar__medidas">PNG, JPEG, GIF o WebP · hasta 2 MB</p>
      </ChCard>
      <ChCard>
        <h3>Tu propio HTML</h3>
        <p>
          Si tienes una pieza hecha, con su CSS y su animación, la corremos tal cual. Se sirve
          aislada del sitio, así que no puede tocar la página ni a quien la visita —y por lo mismo
          tampoco carga trackers de terceros.
        </p>
        <p class="publicitar__medidas">Hasta 600 px de alto · responsive</p>
      </ChCard>
    </div>

    <h2>Qué recibes</h2>
    <div class="publicitar__grilla publicitar__grilla--dos">
      <ChCard>
        <h3><IconChartBar :size="18" aria-hidden="true" /> Números que aguantan</h3>
        <p>
          Contamos impresiones y clicks <strong>en el servidor</strong>, no con un analytics que
          los bloqueadores de publicidad tumban. Te pasamos las cifras con su tamaño de muestra al
          lado: si todavía no alcanza para concluir nada, lo decimos.
        </p>
      </ChCard>
      <ChCard>
        <h3><IconShieldCheck :size="18" aria-hidden="true" /> Sin perseguir a nadie</h3>
        <p>
          No usamos cookies de seguimiento ni perfilamos visitantes. Registramos si el aviso entró
          en pantalla y si alguien hizo click, nada más. Tu marca no aparece al lado de prácticas
          que a esta comunidad no le gustan.
        </p>
      </ChCard>
    </div>

    <section class="publicitar__contacto">
      <h2>Hablemos</h2>
      <p>
        Los valores dependen de la ubicación y del tiempo, así que los conversamos directo.
        Cuéntanos qué espacio te interesa y para cuándo.
      </p>
      <ChButton :href="`mailto:${CONTACTO}?subject=${asunto}&body=${cuerpo}`">
        <IconMail :size="16" aria-hidden="true" /> Escribir a {{ CONTACTO }}
      </ChButton>
    </section>
  </div>
</template>

<style scoped>
.publicitar__volver {
  display: inline-block;
  margin-bottom: 1.5rem;
}

.publicitar h2 {
  margin: 3rem 0 1rem;
}

.publicitar__bajada {
  font-size: 1.1em;
  color: var(--text-muted, #666);
  max-width: 55ch;
}

.publicitar__grilla {
  display: grid;
  gap: 1rem;
}

@media (min-width: 720px) {
  .publicitar__grilla {
    grid-template-columns: repeat(3, 1fr);
  }

  .publicitar__grilla--dos {
    grid-template-columns: repeat(2, 1fr);
  }
}

.publicitar__grilla h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.5rem;
  font-size: 1em;
}

.publicitar__grilla p {
  margin: 0 0 0.5rem;
  font-size: 0.92em;
}

.publicitar__medidas {
  color: var(--text-muted, #666);
  font-size: 0.82em !important;
}

.publicitar__contacto {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
}
</style>
