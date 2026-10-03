import type { PegaSimilaresResultado } from '~/types/pega';

/**
 * Escrituras y búsquedas del alta manual de pegas (panel de admin). Vive
 * como composable por el mismo motivo que `useAdsAdmin.ts`: se puede
 * sustituir en los tests, y el formulario no repite el armado de cada
 * request.
 */
export function usePegasAdmin() {
  return {
    crearPega: (cuerpo: Record<string, unknown>) => $fetch('/api/pegas', { method: 'POST', body: cuerpo }),

    buscarSimilares: (params: { titulo: string; empleador: string; url: string }) =>
      $fetch<PegaSimilaresResultado>('/api/pegas/similares', { method: 'GET', query: params }),
  };
}
