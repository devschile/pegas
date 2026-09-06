<script setup lang="ts">
import { ChButton, ChInput, ChSwitch } from '@devschile/chucao/vue';
import { IconAlertTriangle, IconPencil, IconPlus, IconTrash } from '@tabler/icons-vue';
import { computed, ref } from 'vue';

/**
 * Pestaña de ads del panel. Solo se monta para admin (ver mis-pegas.vue).
 *
 * Las escrituras revalidan el rol en el servidor; esconder la pestaña no
 * protege nada, es solo para no mostrar lo que no corresponde.
 */

interface AdAdmin extends Record<string, unknown> {
  id: number;
  empresa_id: number;
  nombre: string;
  formato: 'imagen' | 'html';
  activo: boolean;
  ubicaciones: string[];
  empresa_nombre: string;
  empresa_activa: boolean;
  es_casa: boolean;
}

interface Empresa {
  id: number;
  nombre: string;
  slug: string;
  activo: boolean;
  es_casa: boolean;
  ads_total: number;
  ads_activos: number;
}

interface EntradaLog {
  id: number;
  ad_id: number | null;
  accion: string;
  detalle: Record<string, unknown> | null;
  fecha: string;
  usuario_nombre: string | null;
}

const { data: ads, refresh: refrescarAds } = await useFetch<AdAdmin[]>('/api/ads/admin', { key: 'ads-admin' });
const { data: empresas, refresh: refrescarEmpresas } = await useFetch<Empresa[]>('/api/empresas', { key: 'empresas-admin' });
const { data: log, refresh: refrescarLog } = await useFetch<EntradaLog[]>('/api/ads/log', {
  key: 'ads-log',
  query: { limite: 20 },
});

const { actualizarAd, borrarAd: borrarAdApi, crearEmpresa: crearEmpresaApi, actualizarEmpresa } = useAdsAdmin();

async function refrescarTodo() {
  await Promise.all([refrescarAds(), refrescarEmpresas(), refrescarLog()]);
}

const editando = ref<AdAdmin | null>(null);
const mostrarForm = ref(false);
const ocupado = ref<number | null>(null);

function nuevo() {
  editando.value = null;
  mostrarForm.value = true;
}

function editar(ad: AdAdmin) {
  editando.value = ad;
  mostrarForm.value = true;
}

async function alGuardar() {
  mostrarForm.value = false;
  editando.value = null;
  await refrescarTodo();
}

/**
 * El PATCH reemplaza la fila completa, así que el toggle manda el ad entero
 * con `activo` invertido. Es lo mismo que hace el formulario.
 */
async function alternarAd(ad: AdAdmin) {
  ocupado.value = ad.id;
  try {
    await actualizarAd(ad.id, { ...ad, activo: !ad.activo });
    await refrescarTodo();
  } finally {
    ocupado.value = null;
  }
}

async function borrar(ad: AdAdmin) {
  if (!confirm(`¿Borrar "${ad.nombre}"? Queda registrado en la actividad, pero el ad no se recupera.`)) return;
  ocupado.value = ad.id;
  try {
    await borrarAdApi(ad.id);
    await refrescarTodo();
  } finally {
    ocupado.value = null;
  }
}

async function alternarEmpresa(e: Empresa) {
  await actualizarEmpresa(e.id, { ...e, activo: !e.activo });
  await refrescarTodo();
}

/** Alta rápida de empresa: el resto de los campos se editan después. */
const nuevaEmpresa = ref({ nombre: '', slug: '' });
const errorEmpresa = ref('');

async function crearEmpresa() {
  errorEmpresa.value = '';
  try {
    await crearEmpresaApi({ ...nuevaEmpresa.value });
    nuevaEmpresa.value = { nombre: '', slug: '' };
    await refrescarTodo();
  } catch (err) {
    errorEmpresa.value = (err as { data?: { message?: string } })?.data?.message ?? 'No se pudo crear';
  }
}

const opcionesEmpresa = computed(() =>
  (empresas.value ?? []).map(e => ({ id: e.id, nombre: e.nombre, activo: e.activo })),
);

/** Un ad prendido cuya empresa está apagada no se publica: hay que decirlo. */
const silenciado = (ad: AdAdmin) => ad.activo && !ad.empresa_activa;

const fecha = (iso: string) =>
  new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div class="panel-ads">
    <section>
      <div class="panel-ads__cabecera">
        <h2>Anunciantes</h2>
      </div>

      <ul class="panel-ads__lista">
        <li v-for="e in empresas ?? []" :key="e.id" class="panel-ads__item">
          <div class="panel-ads__datos">
            <span class="panel-ads__nombre">
              {{ e.nombre }}
              <span v-if="e.es_casa" class="panel-ads__etiqueta">casa</span>
            </span>
            <span class="panel-ads__meta">{{ e.ads_activos }} de {{ e.ads_total }} ads activos</span>
          </div>
          <ChSwitch :checked="e.activo" label="" @ch-change="alternarEmpresa(e)" />
        </li>
      </ul>

      <form class="panel-ads__nueva" @submit.prevent="crearEmpresa">
        <ChInput label="Nueva empresa" placeholder="Nombre" :value="nuevaEmpresa.nombre" @ch-input="nuevaEmpresa.nombre = $event.detail ?? $event" />
        <ChInput label="Slug" placeholder="nombre-en-minusculas" :value="nuevaEmpresa.slug" @ch-input="nuevaEmpresa.slug = $event.detail ?? $event" />
        <ChButton type="submit"><IconPlus :size="16" aria-hidden="true" /> Agregar</ChButton>
      </form>
      <p v-if="errorEmpresa" class="panel-ads__error" role="alert">{{ errorEmpresa }}</p>
    </section>

    <section>
      <div class="panel-ads__cabecera">
        <h2>Ads</h2>
        <ChButton v-if="!mostrarForm" variant="secondary" @ch-click="nuevo">
          <IconPlus :size="16" aria-hidden="true" /> Nuevo ad
        </ChButton>
      </div>

      <PanelFormAd
        v-if="mostrarForm"
        :empresas="opcionesEmpresa"
        :ad="editando"
        @guardado="alGuardar"
        @cancelar="mostrarForm = false"
      />

      <p v-if="!(ads ?? []).length" class="panel-ads__vacio">Todavía no hay ads.</p>

      <ul v-else class="panel-ads__lista">
        <li v-for="ad in ads ?? []" :key="ad.id" class="panel-ads__item">
          <div class="panel-ads__datos">
            <span class="panel-ads__nombre">
              {{ ad.nombre }}
              <span class="panel-ads__etiqueta">{{ ad.formato }}</span>
            </span>
            <span class="panel-ads__meta">
              {{ ad.empresa_nombre }} · {{ ad.ubicaciones.join(', ') }}
            </span>
            <span v-if="silenciado(ad)" class="panel-ads__aviso">
              <IconAlertTriangle :size="14" aria-hidden="true" />
              No se está publicando: su empresa está apagada
            </span>
          </div>

          <div class="panel-ads__acciones">
            <ChSwitch :checked="ad.activo" label="" :disabled="ocupado === ad.id" @ch-change="alternarAd(ad)" />
            <button type="button" :aria-label="`Editar ${ad.nombre}`" @click="editar(ad)">
              <IconPencil :size="16" aria-hidden="true" />
            </button>
            <button type="button" :aria-label="`Borrar ${ad.nombre}`" :disabled="ocupado === ad.id" @click="borrar(ad)">
              <IconTrash :size="16" aria-hidden="true" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section>
      <h2>Actividad</h2>
      <ul class="panel-ads__log">
        <li v-for="l in log ?? []" :key="l.id">
          <span class="panel-ads__meta">{{ fecha(l.fecha) }}</span>
          <strong>{{ l.accion }}</strong>
          <span>{{ (l.detalle?.nombre as string) ?? '—' }}</span>
          <span class="panel-ads__meta">{{ l.usuario_nombre ?? 'alguien' }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.panel-ads {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.panel-ads__cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-ads__cabecera h2,
.panel-ads section > h2 {
  margin: 0 0 1rem;
}

.panel-ads__lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.panel-ads__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.panel-ads__datos {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.panel-ads__nombre {
  font-weight: var(--typography-weight-bold);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-ads__etiqueta {
  font-size: 0.65em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 999px;
  color: var(--text-muted, #666);
  font-weight: var(--typography-weight-regular);
}

.panel-ads__meta {
  font-size: 0.85em;
  color: var(--text-muted, #666);
}

.panel-ads__aviso {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8em;
  color: #fbbf24;
}

.panel-ads__acciones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.panel-ads__acciones button {
  display: inline-flex;
  padding: 0.35rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 0.4rem;
  background: none;
  color: var(--text-muted, #666);
  cursor: pointer;
}

.panel-ads__acciones button:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}

.panel-ads__nueva {
  display: grid;
  gap: 0.75rem;
  align-items: end;
  margin-top: 1.25rem;
}

@media (min-width: 640px) {
  .panel-ads__nueva {
    grid-template-columns: 1fr 1fr auto;
  }
}

.panel-ads__error {
  color: #f87171;
  font-size: 0.9em;
}

.panel-ads__vacio {
  color: var(--text-muted, #666);
  padding: 2rem 0;
}

.panel-ads__log {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85em;
}

.panel-ads__log li {
  display: flex;
  gap: 0.75rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.05));
}
</style>
