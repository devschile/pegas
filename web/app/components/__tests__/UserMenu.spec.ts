import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';

const { useFetchMock, clearMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(),
  clearMock: vi.fn(),
}));
mockNuxtImport('useFetch', () => useFetchMock);

const loggedInRef = ref(false);
mockNuxtImport('useUserSession', () => () => ({ loggedIn: loggedInRef, clear: clearMock }));

async function mountUserMenu() {
  const { default: UserMenu } = await import('../UserMenu.vue');
  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(UserMenu) }),
    }),
  );
  await flushPromises();
  return wrapper;
}

describe('UserMenu', () => {
  beforeEach(() => {
    useFetchMock.mockReset();
    clearMock.mockReset();
    loggedInRef.value = false;
  });

  it('el panel empieza cerrado', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), refresh: vi.fn() });

    const wrapper = await mountUserMenu();

    expect(wrapper.text()).not.toContain('Entrar con GitHub');
  });

  it('deslogueado: el click en el trigger abre links de GitHub y Slack', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), refresh: vi.fn() });

    const wrapper = await mountUserMenu();
    await wrapper.find('.user-menu__trigger').trigger('click');

    expect(wrapper.text()).toContain('Entrar con GitHub');
    expect(wrapper.text()).toContain('Entrar con Slack');
    expect(wrapper.find('a[href="/auth/github"]').exists()).toBe(true);
    expect(wrapper.find('a[href="/auth/slack"]').exists()).toBe(true);
  });

  it('logueado: el trigger muestra el avatar y el panel tiene Mis pegas y Cerrar sesion', async () => {
    loggedInRef.value = true;
    useFetchMock.mockReturnValue({
      data: ref({ id: 1, nombre: 'Dev', avatarUrl: 'https://example.com/a.png' }),
      refresh: vi.fn(),
    });

    const wrapper = await mountUserMenu();

    expect(wrapper.find('img.user-menu__avatar').attributes('src')).toBe('https://example.com/a.png');

    await wrapper.find('.user-menu__trigger').trigger('click');

    expect(wrapper.text()).toContain('Mis pegas');
    expect(wrapper.text()).toContain('Cerrar sesión');
    expect(wrapper.text()).not.toContain('Entrar con GitHub');
  });

  it('logueado sin avatar: el trigger cae al emoji', async () => {
    loggedInRef.value = true;
    useFetchMock.mockReturnValue({ data: ref({ id: 1, nombre: 'Dev', avatarUrl: null }), refresh: vi.fn() });

    const wrapper = await mountUserMenu();

    expect(wrapper.find('img.user-menu__avatar').exists()).toBe(false);
  });

  it('click en Cerrar sesion llama a clear()', async () => {
    loggedInRef.value = true;
    useFetchMock.mockReturnValue({ data: ref({ id: 1, nombre: 'Dev', avatarUrl: null }), refresh: vi.fn() });

    const wrapper = await mountUserMenu();
    await wrapper.find('.user-menu__trigger').trigger('click');
    await wrapper.findComponent({ name: 'ChButton' }).vm.$emit('ch-click');

    expect(clearMock).toHaveBeenCalled();
  });

  it('click afuera cierra el panel', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), refresh: vi.fn() });

    const wrapper = await mountUserMenu();
    await wrapper.find('.user-menu__trigger').trigger('click');
    expect(wrapper.text()).toContain('Entrar con GitHub');

    document.body.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Entrar con GitHub');
  });
});
