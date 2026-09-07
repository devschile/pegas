<script setup lang="ts">
import { ChButton, ChInput, ChSelect, ChSwitch, ChTextarea } from '@devschile/chucao/vue';
import { computed, reactive, ref, watch } from 'vue';
import { UBICACIONES } from '~/composables/useAds';
import { construirSrcdoc } from '~/utils/ads-iframe';
import { PASOS, problemasDeTodo, problemasDelPaso, type FormularioAd, type PasoId } from '~/utils/ad-form';

/**
 * Alta y edición de un ad, en pasos.
 *
 * Estaba todo en una pantalla y la única validación estaba en el servidor:
 * se llenaba entero, se enviaba, y recién ahí aparecía "nombre es
 * obligatorio". Ahora cada paso dice qué le falta antes de dejar avanzar, y
 * el último muestra la pieza tal como se va a ver.
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

const props = defineProps<{
  empresas: EmpresaOpcion[];
  ad?: Record<string, unknown> | null;
}>();

const emit = defineEmits<{ guardado: []; cancelar: [] }>();
const { crearAd, actualizarAd, subirImagen } = useAdsAdmin();

const vacio = (): FormularioAd => ({
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

const form = reactive<FormularioAd>(vacio());
const error = ref('');
const guardando = ref(false);
const paso = ref<PasoId>('anunciante');
/** Los problemas solo se muestran después de intentar avanzar, no mientras se escribe. */
const mostrarProblemas = ref(false);
const editando = computed(() => Boolean(props.ad?.id));

/** Carga el ad a editar, o limpia el formulario si se pasó a "nuevo". */
watch(
  () => props.ad,
  ad => {
    error.value = '';
    paso.value = 'anunciante';
    mostrarProblemas.value = false;
    Object.assign(form, vacio());
    if (!ad) return;
    Object.assign(form, {
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

// ---- navegación entre pasos -------------------------------------------------

const indice = computed(() => PASOS.findIndex(p => p.id === paso.value));
const esUltimo = computed(() => indice.value === PASOS.length - 1);
const problemas = computed(() => problemasDelPaso(paso.value, form));
const problemasFinales = computed(() => problemasDeTodo(form));

/** Un paso ya recorrido se puede revisitar; uno futuro no se puede saltar. */
function irA(destino: PasoId) {
  const i = PASOS.findIndex(p => p.id === destino);
  if (i <= indice.value) {
    paso.value = destino;
    mostrarProblemas.value = false;
    return;
  }
  for (let k = indice.value; k < i; k++) {
    if (problemasDelPaso(PASOS[k]!.id, form).length > 0) {
      paso.value = PASOS[k]!.id;
      mostrarProblemas.value = true;
      return;
    }
  }
  paso.value = destino;
  mostrarProblemas.value = false;
}

function siguiente() {
  if (problemas.value.length > 0) {
    mostrarProblemas.value = true;
    return;
  }
  mostrarProblemas.value = false;
  paso.value = PASOS[Math.min(indice.value + 1, PASOS.length - 1)]!.id;
}

function atras() {
  mostrarProblemas.value = false;
  paso.value = PASOS[Math.max(indice.value - 1, 0)]!.id;
}

// ---- subida de imágenes -----------------------------------------------------

/** Qué campo se está subiendo, para deshabilitar solo ese. */
const subiendo = ref<'desktop' | 'movil' | null>(null);

async function elegirArchivo(cual: 'desktop' | 'movil', e: Event) {
  const archivo = (e.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  error.value = '';
  subiendo.value = cual;
  try {
    const { url } = await subirImagen(archivo);
    if (cual === 'desktop') form.imagen_desktop_url = url;
    else form.imagen_movil_url = url;
  } catch (err) {
    error.value = (err as { data?: { message?: string } })?.data?.message ?? 'No se pudo subir la imagen';
  } finally {
    subiendo.value = null;
    (e.target as HTMLInputElement).value = '';
  }
}

// ---- vista previa -----------------------------------------------------------

/** El id 0 es de mentira: la previa no cuenta impresiones ni clicks. */
const srcdocPrevia = computed(() =>
  form.formato === 'html' && form.html.trim() ? construirSrcdoc(form.html, 0, 'dark') : '',
);

const nombreEmpresa = computed(
  () => props.empresas.find(e => e.id === form.empresa_id)?.nombre ?? '—',
);

const opcionesEmpresa = computed(() =>
  props.empresas.map(e => ({ value: String(e.id), label: e.activo ? e.nombre : `${e.nombre} (apagada)` })),
);

function alternarUbicacion(u: string) {
  const i = form.ubicaciones.indexOf(u);
  if (i === -1) form.ubicaciones.push(u);
  else form.ubicaciones.splice(i, 1);
}

// ---- guardado ---------------------------------------------------------------

const entero = (v: string) => (v.trim() === '' ? null : Number(v));

async function guardar() {
  if (problemasFinales.value.length > 0) {
    mostrarProblemas.value = true;
    return;
  }
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
  <form class="form-ad" @submit.prevent="esUltimo ? guardar() : siguiente()">
    <header class="form-ad__cabecera">
      <h3 class="form-ad__titulo">{{ editando ? 'Editar ad' : 'Nuevo ad' }}</h3>
      <p class="form-ad__ayuda">{{ PASOS[indice]?.ayuda }}</p>
    </header>

    <!-- Los pasos ya hechos se pueden revisitar; los que faltan, no. -->
    <ol class="pasos" aria-label="Pasos">
      <li
        v-for="(p, i) in PASOS"
        :key="p.id"
        class="pasos__item"
        :class="{ 'pasos__item--activo': p.id === paso, 'pasos__item--hecho': i < indice }"
      >
        <button type="button" class="pasos__boton" :aria-current="p.id === paso ? 'step' : undefined" @click="irA(p.id)">
          <span class="pasos__numero">{{ i < indice ? '✓' : i + 1 }}</span>
          <span class="pasos__label">{{ p.titulo }}</span>
        </button>
      </li>
    </ol>

    <!-- Paso 1 -->
    <section v-if="paso === 'anunciante'" class="form-ad__paso">
      <ChSelect
        label="Empresa"
        :options="opcionesEmpresa"
        :value="String(form.empresa_id ?? '')"
        @ch-change="form.empresa_id = Number($event.detail ?? $event)"
      />
      <ChInput
        label="Nombre interno"
        hint="Solo lo ves tú, en la lista de ads. No se publica."
        placeholder="Campaña septiembre"
        :value="form.nombre"
        @ch-input="form.nombre = $event.detail ?? $event"
      />
    </section>

    <!-- Paso 2 -->
    <section v-else-if="paso === 'pieza'" class="form-ad__paso">
      <ChSelect
        label="Formato"
        :options="[
          { value: 'imagen', label: 'Imagen (escritorio + móvil)' },
          { value: 'html', label: 'HTML (se sirve en un iframe aislado)' },
        ]"
        :value="form.formato"
        @ch-change="form.formato = $event.detail ?? $event"
      />

      <template v-if="form.formato === 'imagen'">
        <div class="form-ad__imagen">
          <ChInput
            label="Imagen escritorio (https)"
            :value="form.imagen_desktop_url"
            @ch-input="form.imagen_desktop_url = $event.detail ?? $event"
          />
          <label class="form-ad__subir">
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" :disabled="subiendo !== null" @change="elegirArchivo('desktop', $event)" />
            <span>{{ subiendo === 'desktop' ? 'Subiendo…' : 'Subir archivo' }}</span>
          </label>
        </div>

        <div class="form-ad__imagen">
          <ChInput
            label="Imagen móvil (https)"
            hint="Sin la versión móvil el ad se ve roto en la mitad del tráfico."
            :value="form.imagen_movil_url"
            @ch-input="form.imagen_movil_url = $event.detail ?? $event"
          />
          <label class="form-ad__subir">
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" :disabled="subiendo !== null" @change="elegirArchivo('movil', $event)" />
            <span>{{ subiendo === 'movil' ? 'Subiendo…' : 'Subir archivo' }}</span>
          </label>
        </div>

        <ChInput
          label="Texto alternativo"
          hint="Lo que va a leer quien use lector de pantalla."
          :value="form.alt"
          @ch-input="form.alt = $event.detail ?? $event"
        />
      </template>

      <ChTextarea
        v-else
        label="HTML del anunciante"
        :rows="10"
        hint="Documento completo o fragmento. Corre aislado, sin acceso a la página ni a la sesión."
        :value="form.html"
        @ch-input="form.html = $event.detail ?? $event"
      />

      <div class="form-ad__fila">
        <ChInput
          label="Alto escritorio (px)"
          hint="Opcional. Se reserva ese espacio para no provocar saltos; el ad lo corrige si mide distinto."
          :value="form.alto_desktop"
          @ch-input="form.alto_desktop = $event.detail ?? $event"
        />
        <ChInput
          label="Alto móvil (px)"
          hint="Opcional. Suele necesitar más que el de escritorio."
          :value="form.alto_movil"
          @ch-input="form.alto_movil = $event.detail ?? $event"
        />
      </div>
    </section>

    <!-- Paso 3 -->
    <section v-else-if="paso === 'donde'" class="form-ad__paso">
      <fieldset class="ubicaciones">
        <legend class="ubicaciones__legend">Ubicaciones</legend>
        <label v-for="u in UBICACIONES" :key="u" class="ubicaciones__opcion" :class="{ 'ubicaciones__opcion--on': form.ubicaciones.includes(u) }">
          <input type="checkbox" :checked="form.ubicaciones.includes(u)" @change="alternarUbicacion(u)" />
          <span>{{ u }}</span>
        </label>
      </fieldset>

      <ChInput
        label="Link de destino"
        :hint="form.formato === 'imagen' ? 'Obligatorio: es el único destino que tiene un ad de imagen.' : 'Opcional: en HTML los enlaces van dentro de la pieza.'"
        :value="form.link"
        @ch-input="form.link = $event.detail ?? $event"
      />
    </section>

    <!-- Paso 4 -->
    <section v-else class="form-ad__paso">
      <dl class="resumen">
        <div class="resumen__par"><dt>Empresa</dt><dd>{{ nombreEmpresa }}</dd></div>
        <div class="resumen__par"><dt>Nombre</dt><dd>{{ form.nombre || '—' }}</dd></div>
        <div class="resumen__par"><dt>Formato</dt><dd>{{ form.formato }}</dd></div>
        <div class="resumen__par"><dt>Ubicaciones</dt><dd>{{ form.ubicaciones.join(', ') || '—' }}</dd></div>
        <div class="resumen__par"><dt>Destino</dt><dd class="resumen__url">{{ form.link || '—' }}</dd></div>
      </dl>

      <figure class="previa">
        <figcaption class="previa__titulo">Vista previa</figcaption>
        <iframe
          v-if="form.formato === 'html' && srcdocPrevia"
          class="previa__marco"
          title="Vista previa del ad"
          sandbox="allow-scripts"
          :srcdoc="srcdocPrevia"
          :style="{ height: `${form.alto_desktop || 120}px` }"
        />
        <img
          v-else-if="form.formato === 'imagen' && form.imagen_desktop_url"
          class="previa__imagen"
          :src="form.imagen_desktop_url"
          :alt="form.alt"
        />
        <p v-else class="previa__vacia">Todavía no hay nada que mostrar.</p>
      </figure>

      <ChSwitch
        label="Publicar ahora"
        hint="Si lo dejas apagado queda guardado como borrador y no se muestra a nadie."
        :checked="form.activo"
        @ch-change="form.activo = $event.detail ?? $event"
      />
    </section>

    <ul v-if="mostrarProblemas && (esUltimo ? problemasFinales : problemas).length" class="form-ad__faltan" role="alert">
      <li v-for="p in (esUltimo ? problemasFinales : problemas)" :key="p">{{ p }}</li>
    </ul>

    <p v-if="error" class="form-ad__error" role="alert">{{ error }}</p>

    <footer class="form-ad__acciones">
      <ChButton variant="secondary" @ch-click="emit('cancelar')">Cancelar</ChButton>
      <span class="form-ad__espacio" />
      <ChButton v-if="indice > 0" variant="secondary" @ch-click="atras()">Atrás</ChButton>
      <!--
        `@ch-click` y no `type="submit"`: el <button> real de chucao vive en su
        shadow DOM, no participa del formulario de la página y por lo tanto no
        lo envía. Con `type="submit"` el botón no hacía absolutamente nada.
        El `@submit` del <form> se queda para que Enter siga funcionando.
      -->
      <ChButton :disabled="guardando" @ch-click="esUltimo ? guardar() : siguiente()">
        {{ esUltimo ? (guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear ad') : 'Siguiente' }}
      </ChButton>
    </footer>
  </form>
</template>

<style scoped>
.form-ad {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
  border-radius: 0.9rem;
  margin-bottom: 2rem;
  background: var(--surface, rgba(255, 255, 255, 0.02));
}

.form-ad__cabecera { display: grid; gap: 0.25rem; }
.form-ad__titulo { margin: 0; font-size: 1.15rem; }
.form-ad__ayuda { margin: 0; font-size: 0.85em; color: var(--text-muted, #888); }

/* Barra de pasos */
.pasos {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding-block: 0.7rem;
}

.pasos__boton {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.7rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: none;
  color: var(--text-muted, #888);
  font: inherit;
  font-size: 0.85em;
  cursor: pointer;
}

.pasos__numero {
  display: grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 1px solid currentColor;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}

.pasos__item--hecho .pasos__boton { color: var(--accent, #3ecf8e); }

.pasos__item--activo .pasos__boton {
  color: var(--text, #f2ede9);
  border-color: var(--accent, #3ecf8e);
  background: color-mix(in srgb, var(--accent, #3ecf8e) 12%, transparent);
}

.form-ad__paso { display: flex; flex-direction: column; gap: 1rem; }

.form-ad__fila { display: grid; gap: 1rem; }

@media (min-width: 640px) {
  .form-ad__fila { grid-template-columns: 1fr 1fr; }
}

/* Ubicaciones como fichas: se ve de un vistazo cuáles están elegidas. */
.ubicaciones { border: 0; padding: 0; margin: 0; }
.ubicaciones__legend { font-size: 0.85em; color: var(--text-muted, #888); padding: 0; margin-bottom: 0.5rem; }

.ubicaciones__opcion {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0.5rem 0.5rem 0;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 999px;
  font-size: 0.9em;
  cursor: pointer;
}

.ubicaciones__opcion--on {
  border-color: var(--accent, #3ecf8e);
  color: var(--accent, #3ecf8e);
}

/* Resumen y previa */
.resumen { display: grid; gap: 0.5rem; margin: 0; }
.resumen__par { display: grid; grid-template-columns: 9rem 1fr; gap: 0.5rem; font-size: 0.9em; }
.resumen__par dt { color: var(--text-muted, #888); }
.resumen__par dd { margin: 0; }
.resumen__url { overflow-wrap: anywhere; }

.previa {
  margin: 0;
  border: 1px dashed var(--border, rgba(255, 255, 255, 0.2));
  border-radius: 0.6rem;
  padding: 0.75rem;
}

.previa__titulo { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted, #888); margin-bottom: 0.5rem; }
.previa__marco { display: block; width: 100%; border: 0; }
.previa__imagen { display: block; width: 100%; height: auto; }
.previa__vacia { margin: 0; font-size: 0.9em; color: var(--text-muted, #888); }

.form-ad__subir input { position: absolute; width: 1px; height: 1px; opacity: 0; }

/* El input nativo se esconde y el label hace de botón: el control de archivo
   del navegador no se puede maquetar y desentona con el resto del panel. */
.form-ad__subir {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 0.9rem;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  border-radius: 0.4rem;
  font-size: 0.85em;
  color: var(--text-muted, #888);
  cursor: pointer;
  white-space: nowrap;
}

.form-ad__subir:hover { color: var(--accent); border-color: var(--accent); }
.form-ad__subir:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }

.form-ad__imagen { display: grid; gap: 0.5rem; align-items: end; }

@media (min-width: 640px) {
  .form-ad__imagen { grid-template-columns: 1fr auto; }
}

.form-ad__faltan {
  margin: 0;
  padding: 0.75rem 0.75rem 0.75rem 1.75rem;
  border-radius: 0.5rem;
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.08);
  color: #fca5a5;
  font-size: 0.88em;
}

.form-ad__error { color: #f87171; margin: 0; font-size: 0.9em; }

.form-ad__acciones { display: flex; gap: 0.75rem; align-items: center; }
.form-ad__espacio { flex: 1; }
</style>
