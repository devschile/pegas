import type { Ref } from 'vue';
import type { PegaState, Reaction } from '../../server/utils/reacciones';

interface PegaReactionsDeps {
  isLoggedIn: () => boolean;
  fetch: typeof $fetch;
}

/** Cuánto corrió el propio usuario los conteos públicos de una pega desde que se cargaron. */
export interface PegaDelta {
  likes: number;
  dislikes: number;
  guardados: number;
}

const SIN_DELTA: PegaDelta = { likes: 0, dislikes: 0, guardados: 0 };

/**
 * Lógica pura, sin auto-imports de Nuxt: `usePegaReactions()` (abajo) es el
 * único llamador real, esto existe separado para poder testear sin pelear
 * con `useState`/`useUserSession` -- mockear `useState` rompe el `useRouter`
 * interno de Nuxt (usa `useState('_route', ...)` puertas adentro).
 */
export function createPegaReactionsStore(
  states: Ref<Record<number, PegaState>>,
  deltas: Ref<Record<number, PegaDelta>>,
  deps: PegaReactionsDeps,
) {
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

  /**
   * Los conteos que vienen del server (`job.likes` y compañía) ya incluyen la
   * reacción propia tal como estaba al cargar la página, así que acá solo se
   * acumula la *diferencia* que introdujo el usuario después. Sembrar
   * `states` desde /api/me/pegas-estado no toca el delta (no es un cambio
   * del usuario), que es justamente lo que evita contar dos veces el propio
   * like al hidratar.
   */
  function bump(pegaId: number, patch: Partial<PegaDelta>) {
    const previous = deltas.value[pegaId] ?? SIN_DELTA;
    deltas.value[pegaId] = {
      likes: previous.likes + (patch.likes ?? 0),
      dislikes: previous.dislikes + (patch.dislikes ?? 0),
      guardados: previous.guardados + (patch.guardados ?? 0),
    };
  }

  const asCount = (value: boolean) => (value ? 1 : 0);

  /** Optimista: el estado local cambia al toque, se revierte si el POST falla. */
  async function toggleReaction(pegaId: number, reaccion: Reaction): Promise<void> {
    const previous = states.value[pegaId] ?? { reaccion: null, guardada: false };
    const next = previous.reaccion === reaccion ? null : reaccion;
    const cambio = {
      likes: asCount(next === 'like') - asCount(previous.reaccion === 'like'),
      dislikes: asCount(next === 'dislike') - asCount(previous.reaccion === 'dislike'),
    };

    states.value[pegaId] = { ...previous, reaccion: next };
    bump(pegaId, cambio);

    try {
      await deps.fetch(`/api/pegas/${pegaId}/reaccion`, { method: 'POST', body: { reaccion: next } });
    } catch {
      states.value[pegaId] = previous;
      bump(pegaId, { likes: -cambio.likes, dislikes: -cambio.dislikes });
    }
  }

  async function toggleSaved(pegaId: number): Promise<void> {
    const previous = states.value[pegaId] ?? { reaccion: null, guardada: false };
    const next = !previous.guardada;
    const cambio = next ? 1 : -1;

    states.value[pegaId] = { ...previous, guardada: next };
    bump(pegaId, { guardados: cambio });

    try {
      await deps.fetch(`/api/pegas/${pegaId}/guardado`, { method: 'POST', body: { guardada: next } });
    } catch {
      states.value[pegaId] = previous;
      bump(pegaId, { guardados: -cambio });
    }
  }

  return { states, deltas, loadStates, toggleReaction, toggleSaved };
}

/**
 * `useState('pega-states', ...)` en vez de props: todas las `PegaCard` de
 * una misma página comparten el mismo mapa reactivo, así que el fetch batch
 * (`loadStates`) lo dispara la página una sola vez con todos los ids
 * visibles, no cada card por separado -- evita N+1 requests.
 */
export function usePegaReactions() {
  const states = useState<Record<number, PegaState>>('pega-states', () => ({}));
  const deltas = useState<Record<number, PegaDelta>>('pega-deltas', () => ({}));
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
  return createPegaReactionsStore(states, deltas, { isLoggedIn: () => loggedIn.value, fetch: useRequestFetch() });
}
