import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';

const { useFetchMock, clearMock, navigateToMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(),
  clearMock: vi.fn(),
  navigateToMock: vi.fn(),
}));
mockNuxtImport('useFetch', () => useFetchMock);
mockNuxtImport('navigateTo', () => navigateToMock);

const loggedInRef = ref(false);
mockNuxtImport('useUserSession', () => () => ({ loggedIn: loggedInRef, clear: clearMock }));

/**
 * `open` vive en useState compartido (PegaCard lo abre desde afuera), asi que
 * sin mockearlo el estado se filtra entre tests de este archivo: el segundo
 * click sobre el trigger lo cerraria en vez de abrirlo.
 */
const userMenuOpenRef = ref(false);
mockNuxtImport('useUserMenu', () => () => ({ open: userMenuOpenRef }));

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
    navigateToMock.mockReset();
    loggedInRef.value = false;
    userMenuOpenRef.value = false;
  });

  it('el panel empieza cerrado', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), refresh: vi.fn() });

    const wrapper = await mountUserMenu();

    expect(wrapper.find('a[href="/auth/github"]').exists()).toBe(false);
  });

  it('deslogueado: el click en el trigger abre links de GitHub y Slack', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), refresh: vi.fn() });

    const wrapper = await mountUserMenu();
    await wrapper.find('.user-menu__trigger').trigger('click');

    expect(wrapper.text()).toContain('Inicia sesión:');
    expect(wrapper.find('a[href="/auth/github"]').attributes('aria-label')).toBe('Entrar con GitHub');
    expect(wrapper.find('a[href="/auth/slack"]').attributes('aria-label')).toBe('Entrar con Slack');
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
    expect(wrapper.find('a[href="/auth/github"]').exists()).toBe(false);
  });

  it('logueado sin avatar: el trigger cae al icono generico', async () => {
    loggedInRef.value = true;
    useFetchMock.mockReturnValue({ data: ref({ id: 1, nombre: 'Dev', avatarUrl: null }), refresh: vi.fn() });

    const wrapper = await mountUserMenu();

    expect(wrapper.find('img.user-menu__avatar').exists()).toBe(false);
    expect(wrapper.find('.user-menu__trigger svg').exists()).toBe(true);
  });

  it('click en Cerrar sesion llama a clear() y manda al home', async () => {
    loggedInRef.value = true;
    useFetchMock.mockReturnValue({ data: ref({ id: 1, nombre: 'Dev', avatarUrl: null }), refresh: vi.fn() });

    const wrapper = await mountUserMenu();
    await wrapper.find('.user-menu__trigger').trigger('click');
    await wrapper.findComponent({ name: 'ChButton' }).vm.$emit('ch-click');

    expect(clearMock).toHaveBeenCalled();
    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('click afuera cierra el panel', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), refresh: vi.fn() });

    const wrapper = await mountUserMenu();
    await wrapper.find('.user-menu__trigger').trigger('click');
    expect(wrapper.find('a[href="/auth/github"]').exists()).toBe(true);

    document.body.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('a[href="/auth/github"]').exists()).toBe(false);
  });
});
