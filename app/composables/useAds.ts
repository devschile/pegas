import { computed } from 'vue';

export interface AdPublico {
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

/** Las cuatro ubicaciones donde puede caer un ad. */
export const UBICACIONES = ['header', 'listado', 'footer', 'pega'] as const;

export type AdsPorUbicacion = Record<'header' | 'listado' | 'footer' | 'pega', AdPublico | null>;

const VACIO: AdsPorUbicacion = { header: null, listado: null, footer: null, pega: null };

/**
 * Los ads de todas las ubicaciones en una sola llamada, que es lo que necesita
 * una página para renderizarse completa sin encadenar fetches.
 *
 * La `key` fija hace que varios componentes que lo llamen compartan la misma
 * respuesta: el header y el pie viven en app.vue y el del listado en la
 * página, pero el servidor sortea una vez por request y los tres tienen que
 * ver el mismo resultado.
 */
export function useAds() {
  const { data } = useFetch<AdsPorUbicacion>('/api/ads', { key: 'ads-por-ubicacion' });
  return { ads: computed(() => data.value ?? VACIO) };
}
