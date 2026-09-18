<script setup lang="ts">
import { ChBadge, ChCard } from '@devschile/chucao/vue';
import { IconCoin, IconHome, IconMapPin } from '@tabler/icons-vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { formatDate } from '~/utils/pegas';
import { reasonLabel } from '~/utils/relacionadas';
import { jobSlug } from '~/utils/slug';
import type { PegaRelacionada } from '~/types/pega';

/**
 * Las pegas parecidas a la que se está leyendo.
 *
 * Qué pega entra acá y en qué orden lo decide pegas-core; este componente no
 * elige ni reordena, solo muestra lo que el endpoint le pasó y registra qué
 * hizo la gente con eso. Ver `server/utils/relacionadas.ts`.
 *
 * No reusa `PegaCard` a propósito: esa tarjeta trae reacciones, guardado,
 * controles de administración y el botón de postular, y todo eso compite con
 * el aviso que la persona vino a leer. Acá se necesita lo mínimo para decidir
 * si vale la pena abrirla.
 */
const props = defineProps<{ pegaId: number; relacionadas: PegaRelacionada[] }>();

const track = useTrackEvent();
const { registrar } = useRelatedEvents();
const raiz = ref<HTMLElement | null>(null);

const dispositivo = () =>
  import.meta.client && window.matchMedia('(max-width: 640px)').matches ? 'movil' : 'desktop';

const esRemota = (pega: PegaRelacionada) => Boolean(pega.tags?.includes('remote'));

/**
 * La impresión se cuenta cuando el bloque entra en pantalla, no al renderizar:
 * vive al final de una página de detalle y buena parte de las visitas nunca
 * llega a verlo. Contar el render infla el denominador y haría parecer que la
 * recomendación no funciona cuando lo que pasa es que nadie la vio.
 *
 * Se emite un evento por tarjeta y no uno por bloque porque la pregunta que
 * esta instrumentación existe para responder —qué motivo se gana los clicks—
 * necesita el denominador abierto por motivo, no un total.
 */
let observer: IntersectionObserver | null = null;
let yaContada = false;

function contarImpresiones() {
  if (yaContada) return;
  yaContada = true;
  observer?.disconnect();

  const device = dispositivo();
  props.relacionadas.forEach((pega, posicion) => {
    registrar(props.pegaId, 'impresion', { similarId: pega.id, posicion, dispositivo: device });
    track('relacionada_impresion', {
      pega_id: props.pegaId,
      similar_id: pega.id,
      motivo: pega.motivo,
      posicion,
    });
  });
}

function handleRelatedClick(pega: PegaRelacionada, posicion: number) {
  registrar(props.pegaId, 'click', { similarId: pega.id, posicion, dispositivo: dispositivo() });
  track('relacionada_click', {
    pega_id: props.pegaId,
    similar_id: pega.id,
    motivo: pega.motivo,
    posicion,
  });
}

onMounted(() => {
  if (!raiz.value || typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver(
    entradas => {
      if (entradas.some(e => e.isIntersecting)) contarImpresiones();
    },
    { threshold: 0.5 },
  );
  observer.observe(raiz.value);
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section
    v-if="relacionadas.length"
    ref="raiz"
    class="relacionadas"
    aria-labelledby="relacionadas-titulo"
  >
    <h2 id="relacionadas-titulo" class="relacionadas__titulo">Pegas similares</h2>

    <ul class="relacionadas__lista">
      <li v-for="(pega, posicion) in relacionadas" :key="pega.id">
        <ChCard class="relacionadas__card">
          <NuxtLink
            class="relacionadas__enlace"
            :to="`/pega/${jobSlug(pega)}`"
            @click="handleRelatedClick(pega, posicion)"
          >
            {{ pega.titulo }}
          </NuxtLink>

          <p class="relacionadas__empleador">{{ pega.empleador }} · {{ pega.categoria }}</p>

          <div class="relacionadas__badges">
            <ChBadge v-if="esRemota(pega)" variant="positive">
              <IconHome :size="14" aria-hidden="true" /> Remoto
            </ChBadge>
            <ChBadge v-else><IconMapPin :size="14" aria-hidden="true" /> {{ pega.ubicacion }}</ChBadge>
            <ChBadge v-if="pega.sueldo" variant="positive">
              <IconCoin :size="14" aria-hidden="true" /> {{ pega.sueldo }}
            </ChBadge>
          </div>

          <p class="relacionadas__pie">
            <span v-if="reasonLabel(pega.motivo)" class="relacionadas__motivo">
              {{ reasonLabel(pega.motivo) }}
            </span>
            <span class="relacionadas__fecha">
              {{ formatDate(pega.fecha_publicacion || pega.fecha_creacion) }}
            </span>
          </p>
        </ChCard>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.relacionadas {
  margin-top: 2.5rem;
}

.relacionadas__titulo {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.relacionadas__lista {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Dos columnas no caben en un teléfono sin partir los títulos en una palabra
   por línea. */
@media (max-width: 640px) {
  .relacionadas__lista {
    grid-template-columns: 1fr;
  }
}

.relacionadas__card {
  height: 100%;
}

.relacionadas__enlace {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.relacionadas__enlace:hover,
.relacionadas__enlace:focus-visible {
  text-decoration: underline;
}

.relacionadas__empleador {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.9em;
  color: var(--text-muted, #666);
}

.relacionadas__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.relacionadas__pie {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted, #666);
}

.relacionadas__motivo {
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
