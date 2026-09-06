/**
 * Envío de impresiones y clicks al servidor.
 *
 * Existe como composable y no como un `$fetch` suelto dentro del componente
 * para poder sustituirlo en los tests, que es como el resto del repo maneja
 * las dependencias de red (ver `usePegaReactions`).
 *
 * Nunca lanza: que no se pueda contar un evento no puede romperle la página a
 * nadie, y perder una métrica es preferible a perder al visitante.
 */
export type TipoEventoAd = 'impresion' | 'click';

export interface DimensionesEvento {
  ubicacion: 'header' | 'listado' | 'footer';
  dispositivo: 'desktop' | 'movil';
  posicion?: number | null;
  pagina?: number | null;
}

export function useAdEventos() {
  return {
    async registrar(adId: number, tipo: TipoEventoAd, dimensiones: DimensionesEvento) {
      try {
        await $fetch(`/api/ads/${adId}/${tipo}`, { method: 'POST', body: dimensiones });
      } catch {
        /* contar es best-effort */
      }
    },
  };
}
