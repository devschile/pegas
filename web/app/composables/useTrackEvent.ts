/**
 * Envoltorio delgado sobre $posthog.capture (inyectado por
 * plugins/posthog.client.ts). No-op en SSR o si el plugin no corrio (tests,
 * SSR, o si en algun momento se deshabilita) -- para que ningun componente
 * tenga que chequear null antes de trackear.
 */
export function useTrackEvent() {
  const nuxtApp = useNuxtApp();

  return function track(event: string, properties?: Record<string, unknown>) {
    nuxtApp.$posthog?.capture(event, properties);
  };
}
