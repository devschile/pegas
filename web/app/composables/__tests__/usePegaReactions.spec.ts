import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createPegaReactionsStore, type PegaDelta } from '../usePegaReactions';

function buildStore(overrides: { isLoggedIn?: boolean } = {}) {
  const fetchMock = vi.fn();
  const states = ref<Record<number, { reaccion: 'like' | 'dislike' | null; guardada: boolean }>>({});
  const deltas = ref<Record<number, PegaDelta>>({});
  const store = createPegaReactionsStore(states, deltas, {
    isLoggedIn: () => overrides.isLoggedIn ?? true,
    fetch: fetchMock as unknown as typeof $fetch,
  });
  return { ...store, fetchMock };
}

describe('createPegaReactionsStore', () => {
  describe('loadStates', () => {
    it('no pide nada si no hay sesion', async () => {
      const { loadStates, fetchMock } = buildStore({ isLoggedIn: false });

      await loadStates([1, 2]);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('pide solo los ids que faltan en el estado', async () => {
      const { states, loadStates, fetchMock } = buildStore();
      states.value[1] = { reaccion: 'like', guardada: false };
      fetchMock.mockResolvedValueOnce({ 2: { reaccion: null, guardada: true } });

      await loadStates([1, 2]);

      expect(fetchMock).toHaveBeenCalledWith('/api/me/pegas-estado', { query: { ids: '2' } });
      expect(states.value).toEqual({
        1: { reaccion: 'like', guardada: false },
        2: { reaccion: null, guardada: true },
      });
    });

    it('no llama a fetch si ya tiene todos los ids', async () => {
      const { states, loadStates, fetchMock } = buildStore();
      states.value[1] = { reaccion: null, guardada: false };

      await loadStates([1]);

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('no rompe si el fetch falla', async () => {
      const { loadStates, fetchMock } = buildStore();
      fetchMock.mockRejectedValueOnce(new Error('401'));

      await expect(loadStates([1])).resolves.toBeUndefined();
    });
  });

  describe('toggleReaction', () => {
    it('togglea like de forma optimista y lo confirma con el POST', async () => {
      const { states, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValueOnce({});

      await toggleReaction(5, 'like');

      expect(states.value[5]).toEqual({ reaccion: 'like', guardada: false });
      expect(fetchMock).toHaveBeenCalledWith('/api/pegas/5/reaccion', {
        method: 'POST',
        body: { reaccion: 'like' },
      });
    });

    it('clickear la misma reaccion la apaga (null)', async () => {
      const { states, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValue({});
      states.value[5] = { reaccion: 'like', guardada: false };

      await toggleReaction(5, 'like');

      expect(states.value[5]).toEqual({ reaccion: null, guardada: false });
    });

    it('clickear la reaccion contraria la reemplaza', async () => {
      const { states, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValue({});
      states.value[5] = { reaccion: 'like', guardada: false };

      await toggleReaction(5, 'dislike');

      expect(states.value[5]).toEqual({ reaccion: 'dislike', guardada: false });
    });

    it('revierte el estado optimista si el POST falla', async () => {
      const { states, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockRejectedValueOnce(new Error('fallo'));
      states.value[5] = { reaccion: null, guardada: true };

      await toggleReaction(5, 'like');

      expect(states.value[5]).toEqual({ reaccion: null, guardada: true });
    });
  });

  describe('toggleSaved', () => {
    it('togglea guardada preservando la reaccion', async () => {
      const { states, toggleSaved, fetchMock } = buildStore();
      fetchMock.mockResolvedValueOnce({});
      states.value[5] = { reaccion: 'dislike', guardada: false };

      await toggleSaved(5);

      expect(states.value[5]).toEqual({ reaccion: 'dislike', guardada: true });
      expect(fetchMock).toHaveBeenCalledWith('/api/pegas/5/guardado', {
        method: 'POST',
        body: { guardada: true },
      });
    });

    it('revierte si el POST falla', async () => {
      const { states, toggleSaved, fetchMock } = buildStore();
      fetchMock.mockRejectedValueOnce(new Error('fallo'));
      states.value[5] = { reaccion: 'like', guardada: false };

      await toggleSaved(5);

      expect(states.value[5]).toEqual({ reaccion: 'like', guardada: false });
    });
  });

  /**
   * Los conteos públicos que muestra PegaCard salen de `job.likes + delta`.
   * El delta solo acumula lo que hizo el usuario en esta sesión, nunca lo
   * que ya venía contado del server.
   */
  describe('deltas de conteo', () => {
    it('dar like suma 1 al delta de likes', async () => {
      const { deltas, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValue({});

      await toggleReaction(5, 'like');

      expect(deltas.value[5]).toEqual({ likes: 1, dislikes: 0, guardados: 0 });
    });

    it('sacar el propio like vuelve el delta a 0', async () => {
      const { deltas, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValue({});

      await toggleReaction(5, 'like');
      await toggleReaction(5, 'like');

      expect(deltas.value[5]).toEqual({ likes: 0, dislikes: 0, guardados: 0 });
    });

    it('cambiar de like a nolike mueve el conteo de uno al otro', async () => {
      const { deltas, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValue({});

      await toggleReaction(5, 'like');
      await toggleReaction(5, 'dislike');

      expect(deltas.value[5]).toEqual({ likes: 0, dislikes: 1, guardados: 0 });
    });

    it('sembrar el estado desde el server no mueve el delta (el conteo ya lo incluye)', async () => {
      const { states, deltas, loadStates, fetchMock } = buildStore();
      fetchMock.mockResolvedValueOnce({ 5: { reaccion: 'like', guardada: true } });

      await loadStates([5]);

      expect(states.value[5]).toEqual({ reaccion: 'like', guardada: true });
      expect(deltas.value[5]).toBeUndefined();
    });

    it('quitar un like que ya venia del server resta 1', async () => {
      const { states, deltas, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockResolvedValue({});
      states.value[5] = { reaccion: 'like', guardada: false };

      await toggleReaction(5, 'like');

      expect(deltas.value[5]).toEqual({ likes: -1, dislikes: 0, guardados: 0 });
    });

    it('guardar suma y revierte el delta si el POST falla', async () => {
      const { deltas, toggleSaved, fetchMock } = buildStore();
      fetchMock.mockResolvedValueOnce({});

      await toggleSaved(5);
      expect(deltas.value[5]).toEqual({ likes: 0, dislikes: 0, guardados: 1 });

      fetchMock.mockRejectedValueOnce(new Error('fallo'));
      await toggleSaved(5);

      expect(deltas.value[5]).toEqual({ likes: 0, dislikes: 0, guardados: 1 });
    });

    it('revertir una reaccion fallida tambien revierte el delta', async () => {
      const { deltas, toggleReaction, fetchMock } = buildStore();
      fetchMock.mockRejectedValueOnce(new Error('fallo'));

      await toggleReaction(5, 'like');

      expect(deltas.value[5]).toEqual({ likes: 0, dislikes: 0, guardados: 0 });
    });
  });
});
