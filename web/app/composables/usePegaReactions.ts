import type { Ref } from 'vue';
import type { PegaState, Reaction } from '../../server/utils/reacciones';

interface PegaReactionsDeps {
  isLoggedIn: () => boolean;
  fetch: typeof $fetch;
}

/**
 * Lógica pura, sin auto-imports de Nuxt: `usePegaReactions()` (abajo) es el
 * único llamador real, esto existe separado para poder testear sin pelear
 * con `useState`/`useUserSession` -- mockear `useState` rompe el `useRouter`
 * interno de Nuxt (usa `useState('_route', ...)` puertas adentro).
 */
export function createPegaReactionsStore(states: Ref<Record<number, PegaState>>, deps: PegaReactionsDeps) {
  async function loadStates(pegaIds: number[]): Promise<void> {
    if (!deps.isLoggedIn()) return;

    const missing = pegaIds.filter(id => !(id in states.value));
    if (missing.length === 0) return;

    const fetched = await deps
      .fetch<Record<number, PegaState>>('/api/me/pegas-estado', { query: { ids: missing.join(',') } })
      .catch(() => null);
    if (!fetched) return;

    Object.assign(states.value, fetched);
  }

  /** Optimista: el estado local cambia al toque, se revierte si el POST falla. */
  async function toggleReaction(pegaId: number, reaccion: Reaction): Promise<void> {
    const previous = states.value[pegaId] ?? { reaccion: null, guardada: false };
    const next = previous.reaccion === reaccion ? null : reaccion;
    states.value[pegaId] = { ...previous, reaccion: next };

    try {
      await deps.fetch(`/api/pegas/${pegaId}/reaccion`, { method: 'POST', body: { reaccion: next } });
    } catch {
      states.value[pegaId] = previous;
    }
  }

  async function toggleSaved(pegaId: number): Promise<void> {
    const previous = states.value[pegaId] ?? { reaccion: null, guardada: false };
    const next = !previous.guardada;
    states.value[pegaId] = { ...previous, guardada: next };

    try {
      await deps.fetch(`/api/pegas/${pegaId}/guardado`, { method: 'POST', body: { guardada: next } });
    } catch {
      states.value[pegaId] = previous;
    }
  }

  return { states, loadStates, toggleReaction, toggleSaved };
}

/**
 * `useState('pega-states', ...)` en vez de props: todas las `PegaCard` de
 * una misma página comparten el mismo mapa reactivo, así que el fetch batch
 * (`loadStates`) lo dispara la página una sola vez con todos los ids
 * visibles, no cada card por separado -- evita N+1 requests.
 */
export function usePegaReactions() {
  const states = useState<Record<number, PegaState>>('pega-states', () => ({}));
  const { loggedIn } = useUserSession();
  /**
   * `useRequestFetch()`, no `$fetch`: durante SSR `$fetch` no reenvía las
   * cookies de la request original, así que `loadStates` (que corre en el
   * render inicial, ver index.vue/categoria/[categoria].vue) le pegaba a
   * `/api/me/pegas-estado` sin sesión y fallaba en silencio -- los botones
   * quedaban siempre en su estado inactivo hasta la primera interacción
   * client-side. `useRequestFetch` reenvía esos headers en SSR y se
   * comporta como `$fetch` normal en el navegador.
   */
  return createPegaReactionsStore(states, { isLoggedIn: () => loggedIn.value, fetch: useRequestFetch() });
}
