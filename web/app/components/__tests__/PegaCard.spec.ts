import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import PegaCard from '../PegaCard.vue';
import type { PegaDelta } from '~/composables/usePegaReactions';
import type { Pega } from '~/types/pega';

const { trackMock, toggleReactionMock, toggleSavedMock, fetchMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  toggleReactionMock: vi.fn(),
  toggleSavedMock: vi.fn(),
  fetchMock: vi.fn(),
}));
const statesRef = ref<Record<number, { reaccion: 'like' | 'dislike' | null; guardada: boolean }>>({});
const deltasRef = ref<Record<number, PegaDelta>>({});
const loggedInRef = ref(true);
const isAdminRef = ref(false);
const userMenuOpenRef = ref(false);

mockNuxtImport('useTrackEvent', () => () => trackMock);
mockNuxtImport('useUserSession', () => () => ({ loggedIn: loggedInRef }));
mockNuxtImport('usePegaReactions', () => () => ({
  states: statesRef,
  deltas: deltasRef,
  toggleReaction: toggleReactionMock,
  toggleSaved: toggleSavedMock,
}));
mockNuxtImport('useMe', () => () => ({ me: ref(null), isAdmin: isAdminRef, refresh: vi.fn() }));
mockNuxtImport('useUserMenu', () => () => ({ open: userMenuOpenRef }));
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
  fecha_publicacion: '2026-08-15T15:00:00Z',
  fuente: 'getonbrd',
  fecha_creacion: '2026-08-15T00:00:00.000Z',
  likes: 34,
  dislikes: 5,
  guardados: 12,
};

/** Los botones de accion no tienen texto propio salvo el de guardar, asi que se buscan por aria-label. */
function accion(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.get(`button[aria-label="${label}"]`);
}

describe('PegaCard', () => {
  beforeEach(() => {
    statesRef.value = {};
    deltasRef.value = {};
    loggedInRef.value = true;
    isAdminRef.value = false;
    userMenuOpenRef.value = false;
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

  it('muestra la fecha y la fuente en la columna de meta', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    const meta = wrapper.findAll('.pega-card__fecha').map(nodo => nodo.text());
    expect(meta).toContain('15 Agosto 2026');
    expect(meta).toContain('GetOnBoard');
  });

  it('muestra "hoy" en vez de la fecha larga cuando la pega es de hoy', () => {
    const wrapper = mount(PegaCard, { props: { job: { ...baseJob, fecha_publicacion: new Date().toISOString() } } });

    expect(wrapper.findAll('.pega-card__fecha').map(nodo => nodo.text())).toContain('hoy');
  });

  it('no muestra badge de sueldo cuando no hay sueldo', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(wrapper.text()).not.toContain('USD');
  });

  it('muestra el sueldo cuando esta presente', () => {
    const wrapper = mount(PegaCard, { props: { job: { ...baseJob, sueldo: 'USD 2000 - 3000 /mes' } } });

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

  it('clickear like llama a toggleReaction con "like"', async () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    await accion(wrapper, 'Me gusta').trigger('click');

    expect(toggleReactionMock).toHaveBeenCalledWith(baseJob.id, 'like');
  });

  it('clickear nolike llama a toggleReaction con "dislike"', async () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    await accion(wrapper, 'No me gusta').trigger('click');

    expect(toggleReactionMock).toHaveBeenCalledWith(baseJob.id, 'dislike');
  });

  it('clickear guardar llama a toggleSaved', async () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    await accion(wrapper, 'Guardar').trigger('click');

    expect(toggleSavedMock).toHaveBeenCalledWith(baseJob.id);
  });

  it('marca la clase activa en la reaccion vigente y no en la otra', () => {
    statesRef.value = { [baseJob.id]: { reaccion: 'like', guardada: false } };
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(accion(wrapper, 'Me gusta').classes()).toContain('pega-card__accion--activa');
    expect(accion(wrapper, 'No me gusta').classes()).not.toContain('pega-card__accion--activa');
  });

  it('el boton de guardar cambia de etiqueta y marca la clase activa cuando esta guardada', () => {
    statesRef.value = { [baseJob.id]: { reaccion: null, guardada: true } };
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    const guardar = accion(wrapper, 'Guardar');
    expect(guardar.classes()).toContain('pega-card__accion--activa');
    expect(guardar.text()).toContain('Guardada');
  });

  describe('conteos publicos', () => {
    it('muestra los conteos que vienen con la pega', () => {
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      expect(accion(wrapper, 'Me gusta').text()).toBe('34');
      expect(accion(wrapper, 'No me gusta').text()).toBe('5');
      expect(accion(wrapper, 'Guardar').text()).toContain('12');
    });

    it('suma el delta local al conteo del server', () => {
      deltasRef.value = { [baseJob.id]: { likes: 1, dislikes: -1, guardados: 1 } };
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      expect(accion(wrapper, 'Me gusta').text()).toBe('35');
      expect(accion(wrapper, 'No me gusta').text()).toBe('4');
      expect(accion(wrapper, 'Guardar').text()).toContain('13');
    });
  });

  describe('sin sesion', () => {
    beforeEach(() => {
      loggedInRef.value = false;
    });

    it('no muestra los botones de accion', () => {
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      expect(wrapper.find('button[aria-label="Me gusta"]').exists()).toBe(false);
      expect(wrapper.find('button[aria-label="Guardar"]').exists()).toBe(false);
    });

    it('muestra los conteos atenuados y un acceso a login', () => {
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      const anon = wrapper.get('.pega-card__conteos-anon');
      expect(anon.text()).toContain('34');
      expect(anon.text()).toContain('12');
      expect(anon.attributes('title')).toContain('Inicia sesión');
      expect(wrapper.get('.pega-card__login').text()).toBe('Inicia sesión');
    });

    it('clickear "Inicia sesión" abre el menu de cuenta', async () => {
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      await wrapper.get('.pega-card__login').trigger('click');

      expect(userMenuOpenRef.value).toBe(true);
    });
  });

  describe('admin', () => {
    it('no muestra el boton Desactivar si no es admin', () => {
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      expect(wrapper.find('button[aria-label="Desactivar"]').exists()).toBe(false);
    });

    it('clickear Desactivar llama al endpoint y oculta la card', async () => {
      isAdminRef.value = true;
      fetchMock.mockResolvedValue({ ok: true });
      const wrapper = mount(PegaCard, { props: { job: baseJob } });

      await accion(wrapper, 'Desactivar').trigger('click');
      await wrapper.vm.$nextTick();

      expect(fetchMock).toHaveBeenCalledWith(`/api/pegas/${baseJob.id}/desactivar`, { method: 'POST' });
      expect(wrapper.text()).not.toContain('Frontend Developer');
    });
  });
});
