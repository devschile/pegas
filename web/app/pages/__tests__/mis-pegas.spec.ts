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

const isAdminRef = ref(false);
mockNuxtImport('useMe', () => () => ({ me: ref(null), isAdmin: isAdminRef, refresh: vi.fn() }));

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

/** `misPegas` responde /api/me/pegas, `desactivadas` responde /api/pegas/desactivadas (default: vacio, sin admin no importa el contenido). */
function mockFetches(
  misPegas: { data: unknown; error?: unknown },
  desactivadas: { data: unknown; error?: unknown } = { data: [] },
) {
  useFetchMock.mockImplementation((url: string) => {
    if (url === '/api/pegas/desactivadas') {
      return { data: ref(desactivadas.data), error: ref(desactivadas.error ?? null) };
    }
    return { data: ref(misPegas.data), error: ref(misPegas.error ?? null) };
  });
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
    isAdminRef.value = false;
  });

  it('redirige a / si no hay sesion', async () => {
    loggedInRef.value = false;
    mockFetches({ data: null });

    await mountMisPegas();

    expect(navigateToMock).toHaveBeenCalledWith('/');
  });

  it('muestra un mensaje si no hay pegas guardadas ni reaccionadas', async () => {
    mockFetches({ data: [] });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Todavía no guardaste');
  });

  it('lista las pegas devueltas y siembra el estado compartido', async () => {
    mockFetches({ data: [{ ...buildJob(), reaccion: 'like', guardada: true }] });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(statesRef.value[1]).toEqual({ reaccion: 'like', guardada: true });
  });

  it('muestra un mensaje de error si fallo la carga', async () => {
    mockFetches({ data: null, error: new Error('fallo') });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Error al cargar');
  });

  it('no admin: no muestra la seccion de pegas desactivadas aunque el fetch devuelva datos', async () => {
    mockFetches({ data: [] }, { data: [{ id: 9, titulo: 'X', empleador: 'Y', categoria: 'Otros', fuente: 'jobicy', fecha_actualizacion: '2026-08-19' }] });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).not.toContain('Pegas desactivadas');
  });

  it('admin: muestra la seccion de pegas desactivadas', async () => {
    isAdminRef.value = true;
    mockFetches({ data: [] }, { data: [{ id: 9, titulo: 'Vendedor Puerta a Puerta', empleador: 'Acme', categoria: 'Otros', fuente: 'jobicy', fecha_actualizacion: '2026-08-19' }] });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).toContain('Pegas desactivadas');
    expect(wrapper.text()).toContain('Vendedor Puerta a Puerta');
  });

  it('admin sin pegas desactivadas: no muestra la seccion', async () => {
    isAdminRef.value = true;
    mockFetches({ data: [] }, { data: [] });

    const wrapper = await mountMisPegas();

    expect(wrapper.text()).not.toContain('Pegas desactivadas');
  });
});
