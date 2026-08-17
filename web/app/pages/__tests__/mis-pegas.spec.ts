import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { Pega } from '~/types/pega';

const { useFetchMock, navigateToMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(),
  navigateToMock: vi.fn(),
}));
mockNuxtImport('useFetch', () => useFetchMock);
mockNuxtImport('navigateTo', () => navigateToMock);

const statesRef = ref<Record<number, { reaccion: 'like' | 'dislike' | null; guardada: boolean }>>({});
mockNuxtImport('usePegaReactions', () => () => ({ states: statesRef, toggleReaction: vi.fn(), toggleSaved: vi.fn() }));

const loggedInRef = ref(true);
mockNuxtImport('useUserSession', () => () => ({ loggedIn: loggedInRef }));

function buildJob(overrides: Partial<Pega> = {}): Pega {
  return {
    id: 1,
    url: 'https://example.com/pega/1',
    titulo: 'Frontend Developer',
    empleador: 'Acme',
    descripcion: 'Frontend Developer, Chile',
    categoria: 'Frontend',
    ubicacion: 'Chile',
    sueldo: null,
    tags: null,
    fecha_publicacion: '2026-08-15T00:00:00.000Z',
    fuente: 'getonbrd',
    fecha_creacion: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

async function mountMisPegas() {
  const { default: MisPegasPage } = await import('../mis-pegas.vue');
  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(MisPegasPage) }),
    }),
  );
  await flushPromises();
  return wrapper;
}

describe('pages/mis-pegas', () => {
  beforeEach(() => {
    useFetchMock.mockReset();
    navigateToMock.mockReset();
    statesRef.value = {};
    loggedInRef.value = true;
  });

  it('redirige a / si no hay sesion', async () => {
    loggedInRef.value = false;
    useFetchMock.mockReturnValue({ data: ref(null), error: ref(null) });

    await mountMisPegas();

    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('muestra un mensaje si no hay pegas guardadas ni reaccionadas', async () => {
    useFetchMock.mockReturnValue({ data: ref([]), error: ref(null) });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Todavía no guardaste');
  });

  it('lista las pegas devueltas y siembra el estado compartido', async () => {
    useFetchMock.mockReturnValue({
      data: ref([{ ...buildJob(), reaccion: 'like', guardada: true }]),
      error: ref(null),
    });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(statesRef.value[1]).toEqual({ reaccion: 'like', guardada: true });
  });

  it('muestra un mensaje de error si fallo la carga', async () => {
    useFetchMock.mockReturnValue({ data: ref(null), error: ref(new Error('fallo')) });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Error al cargar');
  });
});
