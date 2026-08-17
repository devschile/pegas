import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createPegaReactionsStore } from '../usePegaReactions';

function buildStore(overrides: { isLoggedIn?: boolean } = {}) {
  const fetchMock = vi.fn();
  const states = ref<Record<number, { reaccion: 'like' | 'dislike' | null; guardada: boolean }>>({});
  const store = createPegaReactionsStore(states, {
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
});
