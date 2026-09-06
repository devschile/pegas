<script setup lang="ts">
import { ChButton, ChInput, ChSelect, ChSwitch, ChTextarea } from '@devschile/chucao/vue';
import { computed, reactive, ref, watch } from 'vue';
import { UBICACIONES } from '~/composables/useAds';

/**
 * Alta y edición de un ad.
 *
 * El PATCH del servidor reemplaza la fila completa, así que el formulario
 * manda siempre todos los campos: no hay actualización parcial que mantener
 * sincronizada entre cliente y servidor.
 */

export interface EmpresaOpcion {
  id: number;
  nombre: string;
  activo: boolean;
}

interface AdEditable {
  id?: number;
  empresa_id: number | null;
  nombre: string;
  formato: 'imagen' | 'html';
  imagen_desktop_url: string;
  imagen_movil_url: string;
  alt: string;
  html: string;
  alto_desktop: string;
  alto_movil: string;
  link: string;
  activo: boolean;
  ubicaciones: string[];
}

const props = defineProps<{
  empresas: EmpresaOpcion[];
  ad?: Record<string, unknown> | null;
}>();

const emit = defineEmits<{ guardado: []; cancelar: [] }>();
const { crearAd, actualizarAd } = useAdsAdmin();

const vacio = (): AdEditable => ({
  empresa_id: props.empresas[0]?.id ?? null,
  nombre: '',
  formato: 'imagen',
  imagen_desktop_url: '',
  imagen_movil_url: '',
  alt: '',
  html: '',
  alto_desktop: '',
  alto_movil: '',
  link: '',
  activo: false,
  ubicaciones: [],
});

const form = reactive<AdEditable>(vacio());
const error = ref('');
const guardando = ref(false);

/** Carga el ad a editar, o limpia el formulario si se pasó a "nuevo". */
watch(
  () => props.ad,
  ad => {
    error.value = '';
    Object.assign(form, vacio());
    if (!ad) return;
    Object.assign(form, {
      id: ad.id as number,
      empresa_id: ad.empresa_id as number,
      nombre: (ad.nombre as string) ?? '',
      formato: (ad.formato as 'imagen' | 'html') ?? 'imagen',
      imagen_desktop_url: (ad.imagen_desktop_url as string) ?? '',
      imagen_movil_url: (ad.imagen_movil_url as string) ?? '',
      alt: (ad.alt as string) ?? '',
      html: (ad.html as string) ?? '',
      alto_desktop: ad.alto_desktop == null ? '' : String(ad.alto_desktop),
      alto_movil: ad.alto_movil == null ? '' : String(ad.alto_movil),
      link: (ad.link as string) ?? '',
      activo: Boolean(ad.activo),
      ubicaciones: [...((ad.ubicaciones as string[]) ?? [])],
    });
  },
  { immediate: true },
);

const opcionesEmpresa = computed(() =>
  props.empresas.map(e => ({ value: String(e.id), label: e.activo ? e.nombre : `${e.nombre} (apagada)` })),
);

const editando = computed(() => Boolean(props.ad?.id));

function alternarUbicacion(u: string) {
  const i = form.ubicaciones.indexOf(u);
  if (i === -1) form.ubicaciones.push(u);
  else form.ubicaciones.splice(i, 1);
}

const entero = (v: string) => (v.trim() === '' ? null : Number(v));

async function guardar() {
  error.value = '';
  guardando.value = true;
  const cuerpo = {
    empresa_id: form.empresa_id,
    nombre: form.nombre,
    formato: form.formato,
    ubicaciones: form.ubicaciones,
    activo: form.activo,
    link: form.link.trim() || null,
    alto_desktop: entero(form.alto_desktop),
    alto_movil: entero(form.alto_movil),
    ...(form.formato === 'imagen'
      ? {
          imagen_desktop_url: form.imagen_desktop_url.trim(),
          imagen_movil_url: form.imagen_movil_url.trim(),
          alt: form.alt.trim(),
        }
      : { html: form.html }),
  };

  try {
    if (editando.value) await actualizarAd(props.ad!.id as number, cuerpo);
    else await crearAd(cuerpo);
    emit('guardado');
  } catch (e) {
    // El servidor manda el porqué en `message`; mostrarlo tal cual es más útil
    // que un "algo salió mal" que obliga a adivinar.
    error.value = (e as { data?: { message?: string } })?.data?.message ?? 'No se pudo guardar';
  } finally {
    guardando.value = false;
  }
}
</script>

<template>
  <form class="form-ad" @submit.prevent="guardar">
    <h3 class="form-ad__titulo">{{ editando ? 'Editar ad' : 'Nuevo ad' }}</h3>

    <div class="form-ad__fila">
      <ChSelect
        label="Empresa"
        :options="opcionesEmpresa"
        :value="String(form.empresa_id ?? '')"
        @ch-change="form.empresa_id = Number($event.detail ?? $event)"
      />
      <ChInput
        label="Nombre interno"
        placeholder="Campaña septiembre"
        :value="form.nombre"
        @ch-input="form.nombre = $event.detail ?? $event"
      />
    </div>

    <ChSelect
      label="Formato"
      :options="[
        { value: 'imagen', label: 'Imagen (desktop + móvil)' },
        { value: 'html', label: 'HTML (se sirve en un iframe aislado)' },
      ]"
      :value="form.formato"
      @ch-change="form.formato = $event.detail ?? $event"
    />

    <template v-if="form.formato === 'imagen'">
      <ChInput
        label="Imagen desktop (https)"
        :value="form.imagen_desktop_url"
        @ch-input="form.imagen_desktop_url = $event.detail ?? $event"
      />
      <ChInput
        label="Imagen móvil (https)"
        hint="Sin la versión móvil el ad se ve roto en la mitad del tráfico."
        :value="form.imagen_movil_url"
        @ch-input="form.imagen_movil_url = $event.detail ?? $event"
      />
      <ChInput
        label="Texto alternativo"
        hint="Lo que va a leer quien use lector de pantalla."
        :value="form.alt"
        @ch-input="form.alt = $event.detail ?? $event"
      />
    </template>

    <template v-else>
      <ChTextarea
        label="HTML del anunciante"
        :rows="10"
        hint="Documento completo o fragmento. Corre aislado, sin acceso a la página ni a la sesión."
        :value="form.html"
        @ch-input="form.html = $event.detail ?? $event"
      />
      <div class="form-ad__fila">
        <ChInput
          label="Alto desktop (px)"
          hint="Se reserva ese espacio para no provocar saltos; el ad lo corrige si mide distinto."
          :value="form.alto_desktop"
          @ch-input="form.alto_desktop = $event.detail ?? $event"
        />
        <ChInput
          label="Alto móvil (px)"
          :value="form.alto_movil"
          @ch-input="form.alto_movil = $event.detail ?? $event"
        />
      </div>
    </template>

    <ChInput
      label="Link de destino"
      :hint="form.formato === 'imagen' ? 'Obligatorio.' : 'Opcional: en HTML los enlaces van dentro de la pieza.'"
      :value="form.link"
      @ch-input="form.link = $event.detail ?? $event"
    />

    <fieldset class="form-ad__ubicaciones">
      <legend>Ubicaciones</legend>
      <label v-for="u in UBICACIONES" :key="u" class="form-ad__ubicacion">
        <input type="checkbox" :checked="form.ubicaciones.includes(u)" @change="alternarUbicacion(u)" />
        {{ u }}
      </label>
    </fieldset>

    <ChSwitch
      label="Activo"
      hint="Un ad nuevo nace apagado: préndelo cuando ya lo viste."
      :checked="form.activo"
      @ch-change="form.activo = $event.detail ?? $event"
    />

    <p v-if="error" class="form-ad__error" role="alert">{{ error }}</p>

    <div class="form-ad__acciones">
      <ChButton type="submit" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</ChButton>
      <ChButton variant="secondary" @ch-click="emit('cancelar')">Cancelar</ChButton>
    </div>
  </form>
</template>

<style scoped>
.form-ad {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 0.75rem;
  margin-bottom: 2rem;
}

.form-ad__titulo {
  margin: 0;
}

.form-ad__fila {
  display: grid;
  gap: 1rem;
}

@media (min-width: 640px) {
  .form-ad__fila {
    grid-template-columns: 1fr 1fr;
  }
}

.form-ad__ubicaciones {
  border: 0;
  padding: 0;
  margin: 0;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.form-ad__ubicaciones legend {
  font-size: 0.85em;
  color: var(--text-muted, #666);
  padding: 0;
  margin-bottom: 0.4rem;
}

.form-ad__ubicacion {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9em;
}

.form-ad__error {
  color: #f87171;
  margin: 0;
  font-size: 0.9em;
}

.form-ad__acciones {
  display: flex;
  gap: 0.75rem;
}
</style>
