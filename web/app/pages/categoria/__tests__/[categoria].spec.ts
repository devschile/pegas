import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { Pega, PegasData } from '~/types/pega';

const { useJobsMock, useRouteMock, trackMock } = vi.hoisted(() => ({
  useJobsMock: vi.fn(),
  useRouteMock: vi.fn(),
  trackMock: vi.fn(),
}));
mockNuxtImport('useJobs', () => useJobsMock);
mockNuxtImport('useRoute', () => useRouteMock);
mockNuxtImport('useTrackEvent', () => () => trackMock);

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
    tags: 'remote',
    fecha_publicacion: '2026-08-15T00:00:00.000Z',
    fuente: 'getonbrd',
    fecha_creacion: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

function buildJobsData(overrides: Partial<PegasData> = {}): PegasData {
  return {
    total: 2,
    fuentes: ['getonbrd', 'linkedin'],
    categorias: ['Frontend', 'Backend'],
    actualizado: '2026-08-15T00:00:00.000Z',
    pegas: [
      buildJob({ id: 1, categoria: 'Frontend', titulo: 'Frontend Developer' }),
      buildJob({ id: 2, categoria: 'Backend', titulo: 'Backend Developer', fuente: 'linkedin' }),
    ],
    ...overrides,
  };
}

async function mountCategoryPage() {
  const { default: CategoryPage } = await import('../[categoria].vue');
  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(CategoryPage) }),
    }),
  );
  await flushPromises();
  return wrapper;
}

/**
 * createError() dentro de un setup() async atrapado por <Suspense> no
 * rechaza la promesa que devuelve mount() — Vue sigue intentando renderizar
 * el árbol después del error (con bindings a medio resolver -> un segundo
 * error, ese sí un TypeError irrelevante). app.config.errorHandler es el
 * único gancho que ve TODOS los errores en orden; nos quedamos con el
 * primero, que es el createError() real.
 */
async function mountCategoryPageExpectingError() {
  const { default: CategoryPage } = await import('../[categoria].vue');
  const capturedErrors: unknown[] = [];
  mount(
    defineComponent({ render: () => h(Suspense, null, { default: () => h(CategoryPage) }) }),
    { global: { config: { errorHandler: error => { capturedErrors.push(error); } } } },
  );
  await flushPromises();
  return capturedErrors[0];
}

describe('pages/categoria/[categoria]', () => {
  it('muestra solo las pegas de la categoria del slug', async () => {
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });

    const wrapper = await mountCategoryPage();

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.text()).not.toContain('Backend Developer');
  });

  it('trackea categoria_view al montar', async () => {
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });
    trackMock.mockClear();

    await mountCategoryPage();

    expect(trackMock).toHaveBeenCalledWith('categoria_view', expect.objectContaining({ categoria: 'Frontend', total: 1 }));
  });

  it('tira 404 si la categoria del slug no existe', async () => {
    useRouteMock.mockReturnValue({ params: { categoria: 'no-existe' }, path: '/categoria/no-existe', fullPath: '/categoria/no-existe', matched: [] });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });

    const error = await mountCategoryPageExpectingError();

    expect(error).toMatchObject({ statusCode: 404 });
  });

  it('tira 500 si fallo la carga de datos', async () => {
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useJobsMock.mockReturnValue({ data: ref(null), error: ref(new Error('fallo')) });

    const error = await mountCategoryPageExpectingError();

    expect(error).toMatchObject({ statusCode: 500 });
  });
});
