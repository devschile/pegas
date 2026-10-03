<script setup lang="ts">
import { ChButton, ChInput, ChSelect, ChTextarea } from '@devschile/chucao/vue';
import { IconAlertTriangle, IconCircleCheck, IconExternalLink } from '@tabler/icons-vue';
import { computed, reactive, ref, watch } from 'vue';
import type { Pega, PegasMeta, PegaSimilaresResultado } from '~/types/pega';
import { debounce } from '~/utils/debounce';
import { sourceLabel } from '~/utils/pegas';

/**
 * Alta manual de una pega, para lo que llega por un canal que el pipeline
 * automático no cubre (ver README) -- típicamente un aviso compartido en
 * Slack. Solo se monta para admin (ver mis-pegas.vue), igual que PanelAds.
 *
 * Busca similares mientras se escribe para avisar de un posible duplicado
 * ANTES de llenar el resto del formulario -- eso es lo que pidió el aviso
 * original: "buscar similitud en los publicados si ya existe". El aviso
 * nunca bloquea salvo la URL exacta, que la base igual va a rechazar (es
 * UNIQUE), así que ahí sí se deshabilita el envío.
 */

const { data: meta } = await useFetch<PegasMeta>('/api/meta', { key: 'meta-categorias' });
const opcionesCategoria = computed(() =>
  (meta.value?.categorias ?? []).map(c => ({ value: c, label: c })),
);

const vacio = () => ({
  url: '',
  titulo: '',
  empleador: '',
  categoria: '',
  ubicacion: '',
  descripcion: '',
  sueldo: '',
  tags: '',
  fecha_publicacion: '',
});

const form = reactive(vacio());
const error = ref('');
const guardando = ref(false);
const creada = ref<Pega | null>(null);

const { crearPega, buscarSimilares } = usePegasAdmin();

// ---- búsqueda de similares ---------------------------------------------------

const similares = ref<PegaSimilaresResultado | null>(null);
const buscando = ref(false);

const ejecutarBusqueda = debounce(async (titulo: string, empleador: string, url: string) => {
  if (!titulo && !empleador && !url) {
    similares.value = null;
    return;
  }
  buscando.value = true;
  try {
    similares.value = await buscarSimilares({ titulo, empleador, url });
  } catch {
    // Es solo un aviso -- si falla la búsqueda no tiene sentido cortarle el
    // formulario a quien está cargando, puede seguir y guardar igual.
    similares.value = null;
  } finally {
    buscando.value = false;
  }
}, 400);

watch(
  () => [form.titulo, form.empleador, form.url] as const,
  ([titulo, empleador, url]) => ejecutarBusqueda(titulo.trim(), empleador.trim(), url.trim()),
);

const hayDuplicadoExacto = computed(() => Boolean(similares.value?.exacta));

// ---- guardado -----------------------------------------------------------------

const camposCompletos = computed(() =>
  Boolean(form.url.trim() && form.titulo.trim() && form.empleador.trim() && form.categoria.trim() && form.ubicacion.trim() && form.descripcion.trim()),
);

async function guardar() {
  if (!camposCompletos.value || hayDuplicadoExacto.value) return;
  error.value = '';
  guardando.value = true;
  try {
    creada.value = await crearPega({
      url: form.url.trim(),
      titulo: form.titulo.trim(),
      empleador: form.empleador.trim(),
      categoria: form.categoria,
      ubicacion: form.ubicacion.trim(),
      descripcion: form.descripcion.trim(),
      sueldo: form.sueldo.trim() || null,
      tags: form.tags.trim() || null,
      fecha_publicacion: form.fecha_publicacion || null,
    });
    Object.assign(form, vacio());
    similares.value = null;
  } catch (e) {
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'No se pudo guardar';
  } finally {
    guardando.value = false;
  }
}

function cargarOtra() {
  creada.value = null;
}

/**
 * ch-button no tiene prop href/target -- es un <button>, no navega solo (ver
 * AGENTS.md). Se abre la URL a mano, igual que "Ver oferta" en PegaCard.vue.
 */
function verPega() {
  if (!creada.value) return;
  window.open(`/pega/${creada.value.id}`, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <div class="agregar-pega">
    <p v-if="creada" class="agregar-pega__exito" role="status">
      <IconCircleCheck :size="18" aria-hidden="true" />
      <span>Se creó "{{ creada.titulo }}".</span>
      <ChButton @ch-click="verPega">Verla <IconExternalLink :size="14" aria-hidden="true" /></ChButton>
      <ChButton variant="secondary" @ch-click="cargarOtra">Cargar otra</ChButton>
    </p>

    <form v-else class="agregar-pega__form" @submit.prevent="guardar">
      <ChInput
        label="URL del aviso"
        hint="El link original: a la ATS, al post de LinkedIn, al que se compartió en Slack."
        placeholder="https://..."
        :value="form.url"
        @ch-input="form.url = $event.detail ?? $event"
      />
      <ChInput
        label="Título"
        placeholder="Desarrollador Backend"
        :value="form.titulo"
        @ch-input="form.titulo = $event.detail ?? $event"
      />
      <ChInput
        label="Empleador"
        placeholder="Sky Airline"
        :value="form.empleador"
        @ch-input="form.empleador = $event.detail ?? $event"
      />

      <p v-if="buscando" class="agregar-pega__buscando">Buscando parecidas…</p>

      <p v-if="hayDuplicadoExacto" class="agregar-pega__aviso agregar-pega__aviso--bloquea" role="alert">
        <IconAlertTriangle :size="16" aria-hidden="true" />
        Ya hay una pega con esa URL:
        <a :href="`/pega/${similares!.exacta!.id}`" target="_blank" rel="noopener noreferrer">
          {{ similares!.exacta!.titulo }} <IconExternalLink :size="12" aria-hidden="true" />
        </a>
      </p>

      <div v-if="similares?.similares.length" class="agregar-pega__aviso" role="status">
        <IconAlertTriangle :size="16" aria-hidden="true" />
        <div>
          <p class="agregar-pega__aviso-titulo">Esto ya podría estar publicado:</p>
          <ul class="agregar-pega__similares">
            <li v-for="s in similares.similares" :key="s.id">
              <a :href="`/pega/${s.id}`" target="_blank" rel="noopener noreferrer">{{ s.titulo }}</a>
              — {{ s.empleador }} · {{ sourceLabel(s.fuente) }}
            </li>
          </ul>
        </div>
      </div>

      <ChSelect
        label="Categoría"
        hint="Una de las que ya usa el sitio, para no crear una categoría suelta."
        :options="opcionesCategoria"
        :value="form.categoria"
        @ch-change="form.categoria = $event.detail ?? $event"
      />
      <ChInput
        label="Ubicación"
        placeholder="Santiago, Chile / Remoto"
        :value="form.ubicacion"
        @ch-input="form.ubicacion = $event.detail ?? $event"
      />
      <ChTextarea
        label="Descripción"
        :rows="6"
        :value="form.descripcion"
        @ch-input="form.descripcion = $event.detail ?? $event"
      />
      <div class="agregar-pega__fila">
        <ChInput
          label="Sueldo"
          hint="Opcional. Tal como se va a mostrar."
          :value="form.sueldo"
          @ch-input="form.sueldo = $event.detail ?? $event"
        />
        <ChInput
          label="Tags"
          hint="Opcional, separados por coma. 'remote' la marca como remota."
          :value="form.tags"
          @ch-input="form.tags = $event.detail ?? $event"
        />
      </div>
      <ChInput
        label="Fecha de publicación"
        hint="Opcional, formato AAAA-MM-DD. Si se deja vacía, se ordena por la fecha de carga."
        placeholder="2026-10-03"
        :value="form.fecha_publicacion"
        @ch-input="form.fecha_publicacion = $event.detail ?? $event"
      />

      <p v-if="error" class="agregar-pega__error" role="alert">{{ error }}</p>

      <!--
        `@ch-click` y no solo `type="submit"`: el <button> real de chucao vive
        en su shadow DOM y no participa del formulario de la página (ver el
        mismo comentario en FormAd.vue). El `@submit` del <form> se queda
        para que Enter siga funcionando.
      -->
      <ChButton :disabled="!camposCompletos || hayDuplicadoExacto || guardando" @ch-click="guardar">
        {{ guardando ? 'Guardando…' : 'Crear pega' }}
      </ChButton>
    </form>
  </div>
</template>

<style scoped>
.agregar-pega__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
}

.agregar-pega__fila {
  display: grid;
  gap: 1rem;
}

@media (min-width: 640px) {
  .agregar-pega__fila {
    grid-template-columns: 1fr 1fr;
  }
}

.agregar-pega__buscando {
  margin: 0;
  font-size: 0.85em;
  color: var(--text-muted, #666);
}

.agregar-pega__aviso {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.08);
  color: #fbbf24;
  font-size: 0.88em;
  margin: 0;
}

.agregar-pega__aviso--bloquea {
  align-items: center;
  border-color: rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.08);
  color: #f87171;
}

.agregar-pega__aviso-titulo {
  margin: 0 0 0.35rem;
  font-weight: var(--typography-weight-bold);
  color: var(--text, inherit);
}

.agregar-pega__similares {
  margin: 0;
  padding-left: 1.1rem;
  color: var(--text, inherit);
}

.agregar-pega__error {
  color: #f87171;
  margin: 0;
  font-size: 0.9em;
}

.agregar-pega__exito {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  color: #3ecf8e;
}
</style>
