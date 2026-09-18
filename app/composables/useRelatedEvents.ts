/**
 * Envío de impresiones y clicks del bloque de relacionadas.
 *
 * Existe como composable y no como un `$fetch` suelto en el componente para
 * poder sustituirlo en los tests, igual que `useAdEventos`.
 *
 * Nunca lanza: no poder contar un evento no puede romperle la página a nadie.
 */
export type TipoEventoRelacionada = 'impresion' | 'click';

export interface DimensionesRelacionada {
  similarId: number;
  posicion: number;
  dispositivo: 'desktop' | 'movil';
}

/**
 * El click se manda con `sendBeacon` y no con `fetch`.
 *
 * A diferencia de un ad —que abre pestaña nueva y deja la página viva— una
 * relacionada navega en la misma pestaña: el navegador puede abortar una
 * petición en vuelo cuando el documento se descarga, y justo el evento que
 * más importa (el click, el numerador del CTR) sería el que más se perdiera.
 * `sendBeacon` se encola en el navegador y sobrevive a la navegación.
 *
 * Devuelve false si no está disponible o si el navegador rechaza la cola, y
 * ahí se cae al `$fetch` con `keepalive`.
 */
function sendBeacon(url: string, body: DimensionesRelacionada): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return false;
  try {
    return navigator.sendBeacon(url, new Blob([JSON.stringify(body)], { type: 'application/json' }));
  } catch {
    return false;
  }
}

export function useRelatedEvents() {
  return {
    async registrar(pegaId: number, tipo: TipoEventoRelacionada, dimensiones: DimensionesRelacionada) {
      const url = `/api/pegas/${pegaId}/relacionadas/${tipo}`;
      if (tipo === 'click' && sendBeacon(url, dimensiones)) return;

      try {
        await $fetch(url, { method: 'POST', body: dimensiones, keepalive: true });
      } catch {
        /* contar es best-effort */
      }
    },
  };
}
