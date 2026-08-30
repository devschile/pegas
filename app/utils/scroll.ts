/** Scroll suave al tope de la pagina. No-op si no hay `window` (SSR). */
export function scrollToTop(): void {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
