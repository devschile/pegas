import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import PegaCard from '../PegaCard.vue';
import type { Pega } from '~/types/pega';

const { trackMock, toggleReactionMock, toggleSavedMock, fetchMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  toggleReactionMock: vi.fn(),
  toggleSavedMock: vi.fn(),
  fetchMock: vi.fn(),
}));
const statesRef = ref<Record<number, { reaccion: 'like' | 'dislike' | null; guardada: boolean }>>({});
const loggedInRef = ref(true);
const isAdminRef = ref(false);

mockNuxtImport('useTrackEvent', () => () => trackMock);
mockNuxtImport('useUserSession', () => () => ({ loggedIn: loggedInRef }));
mockNuxtImport('usePegaReactions', () => () => ({
  states: statesRef,
  toggleReaction: toggleReactionMock,
  toggleSaved: toggleSavedMock,
}));
mockNuxtImport('useMe', () => () => ({ me: ref(null), isAdmin: isAdminRef, refresh: vi.fn() }));
mockNuxtImport('$fetch', () => fetchMock);

const baseJob: Pega = {
  id: 1,
  url: 'https://example.com/pega/1',
  titulo: 'Frontend Developer',
  empleador: 'Acme',
  descripcion: 'Frontend Developer, Chile',
  categoria: 'Frontend',
  ubicacion: 'Chile',
  sueldo: null,
  tags: 'remote',
  fecha_publicacion: '2026-08-15T00:00:00.000Z',
  fuente: 'getonbrd',
  fecha_creacion: '2026-08-15T00:00:00.000Z',
};

describe('PegaCard', () => {
  beforeEach(() => {
    statesRef.value = {};
    loggedInRef.value = true;
    isAdminRef.value = false;
    toggleReactionMock.mockClear();
    toggleSavedMock.mockClear();
    fetchMock.mockReset();
  });

  it('muestra el titulo, el empleador y la ubicacion', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Chile');
  });

  it('no muestra badge de sueldo cuando no hay sueldo', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(wrapper.text()).not.toContain('USD');
  });

  it('muestra el sueldo cuando esta presente', () => {
    const job = { ...baseJob, sueldo: 'USD 2000 - 3000 /mes' };
    const wrapper = mount(PegaCard, { props: { job } });

    expect(wrapper.text()).toContain('USD 2000 - 3000 /mes');
  });

  it('al hacer click en "Ver oferta" abre el aviso original y trackea el evento', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    trackMock.mockClear();
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    await wrapper.findComponent({ name: 'ChButton' }).vm.$emit('ch-click');

    expect(openSpy).toHaveBeenCalledWith(baseJob.url, '_blank', 'noopener,noreferrer');
    expect(trackMock).toHaveBeenCalledWith(
      'pega_click_apply',
      expect.objectContaining({ pega_id: baseJob.id, empleador: baseJob.empleador }),
    );

    openSpy.mockRestore();
  });

  it('los botones de reaccion y guardar estan deshabilitados sin sesion', () => {
    loggedInRef.value = false;
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    const buttons = wrapper.findAllComponents({ name: 'ChButton' });
    expect(buttons.find(b => b.props('label') === 'Me gusta')!.props('disabled')).toBe(true);
    expect(buttons.find(b => b.props('label') === 'No me gusta')!.props('disabled')).toBe(true);
    expect(buttons.find(b => b.props('label') === 'Guardar')!.props('disabled')).toBe(true);
  });

  it('clickear like llama a toggleReaction con "like"', async () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });
    const likeButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'Me gusta')!;

    await likeButton.vm.$emit('ch-click');

    expect(toggleReactionMock).toHaveBeenCalledWith(baseJob.id, 'like');
  });

  it('clickear nolike llama a toggleReaction con "dislike"', async () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });
    const dislikeButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'No me gusta')!;

    await dislikeButton.vm.$emit('ch-click');

    expect(toggleReactionMock).toHaveBeenCalledWith(baseJob.id, 'dislike');
  });

  it('clickear guardar llama a toggleSaved', async () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });
    const saveButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'Guardar')!;

    await saveButton.vm.$emit('ch-click');

    expect(toggleSavedMock).toHaveBeenCalledWith(baseJob.id);
  });

  it('el boton de like marca la clase activa cuando la reaccion esta activa', () => {
    statesRef.value = { [baseJob.id]: { reaccion: 'like', guardada: false } };
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    const likeButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'Me gusta')!;
    const dislikeButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'No me gusta')!;
    expect(likeButton.classes()).toContain('pega-card__reaction-btn--active');
    expect(dislikeButton.classes()).not.toContain('pega-card__reaction-btn--active');
  });

  it('el boton de guardar marca la clase activa cuando esta guardada', () => {
    statesRef.value = { [baseJob.id]: { reaccion: null, guardada: true } };
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    const saveButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'Guardar')!;
    expect(saveButton.classes()).toContain('pega-card__reaction-btn--active');
  });

  it('no muestra el boton Desactivar si no es admin', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'Desactivar')).toBeUndefined();
  });

  it('admin: clickear Desactivar llama al endpoint y oculta la card', async () => {
    isAdminRef.value = true;
    fetchMock.mockResolvedValue({ ok: true });
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    const desactivarButton = wrapper.findAllComponents({ name: 'ChButton' }).find(b => b.props('label') === 'Desactivar')!;
    expect(desactivarButton).toBeDefined();

    await desactivarButton.vm.$emit('ch-click');
    await wrapper.vm.$nextTick();

    expect(fetchMock).toHaveBeenCalledWith(`/api/pegas/${baseJob.id}/desactivar`, { method: 'POST' });
    expect(wrapper.text()).not.toContain('Frontend Developer');
  });
});
