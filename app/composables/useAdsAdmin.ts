/**
 * Escrituras del panel de ads.
 *
 * Vive como composable y no como `$fetch` suelto dentro de los componentes por
 * dos razones: se puede sustituir en los tests (un `$fetch` auto-importado no
 * se deja stubear), y el formulario y la lista comparten las mismas llamadas
 * en vez de duplicarlas.
 *
 * Los errores se propagan tal cual: quien llama muestra el `message` que manda
 * el servidor, que dice qué campo está mal.
 */
export function useAdsAdmin() {
  return {
    crearAd: (cuerpo: Record<string, unknown>) => $fetch('/api/ads', { method: 'POST', body: cuerpo }),

    actualizarAd: (id: number, cuerpo: Record<string, unknown>) =>
      $fetch(`/api/ads/${id}`, { method: 'PATCH', body: cuerpo }),

    borrarAd: (id: number) => $fetch(`/api/ads/${id}`, { method: 'DELETE' }),

    crearEmpresa: (cuerpo: Record<string, unknown>) =>
      $fetch('/api/empresas', { method: 'POST', body: cuerpo }),

    actualizarEmpresa: (id: number, cuerpo: Record<string, unknown>) =>
      $fetch(`/api/empresas/${id}`, { method: 'PATCH', body: cuerpo }),

    /**
     * Sube una imagen y devuelve su URL https. El servidor valida los bytes y
     * le pone nombre propio: lo que mande el navegador como tipo o nombre no
     * se usa para nada.
     */
    subirImagen: (archivo: File) => {
      const datos = new FormData();
      datos.append('archivo', archivo);
      return $fetch<{ url: string; nombre: string }>('/api/ads/imagen', { method: 'POST', body: datos });
    },
  };
}
