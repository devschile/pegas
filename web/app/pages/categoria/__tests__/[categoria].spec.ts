import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { Pega, PegasMeta } from '~/types/pega';

const { useJobsMock, useJobsListingStateMock, useFetchMock, useRouteMock, trackMock } = vi.hoisted(() => ({
  useJobsMock: vi.fn(),
  useJobsListingStateMock: vi.fn(),
  useFetchMock: vi.fn(),
  useRouteMock: vi.fn(),
  trackMock: vi.fn(),
}));
mockNuxtImport('useJobs', () => useJobsMock);
mockNuxtImport('useJobsListingState', () => useJobsListingStateMock);
mockNuxtImport('useFetch', () => useFetchMock);
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
    likes: 0,
    dislikes: 0,
    guardados: 0,
    ...overrides,
  };
}

function buildMeta(overrides: Partial<PegasMeta> = {}): PegasMeta {
  return {
    total: 2,
    fuentes: ['getonbrd', 'linkedin'],
    categorias: ['Frontend', 'Backend'],
    actualizado: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

function mockListing() {
  const page = ref(1);
  useJobsListingStateMock.mockReturnValue({
    page,
    filters: ref({ q: '', categoria: '', fuente: '', pagina: 1 }),
    nextPage: vi.fn(() => page.value++),
    prevPage: vi.fn(() => { if (page.value > 1) page.value--; }),
  });
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
    mockListing();
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()), error: ref(null) });
    useJobsMock.mockReturnValue({ data: ref({ total: 1, pagina: 1, porPagina: 25, pegas: [buildJob({ id: 1, categoria: 'Frontend' })] }), error: ref(null) });

    const wrapper = await mountCategoryPage();

    expect(wrapper.text()).toContain('Frontend Developer');
  });

  it('pide /api/pegas con la categoria resuelta desde el slug', async () => {
    mockListing();
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()), error: ref(null) });
    useJobsMock.mockReturnValue({ data: ref({ total: 1, pagina: 1, porPagina: 25, pegas: [buildJob()] }), error: ref(null) });

    await mountCategoryPage();

    const [filtersArg] = useJobsMock.mock.calls[0]!;
    expect(filtersArg.value).toMatchObject({ categoria: 'Frontend' });
  });

  it('trackea categoria_view al montar', async () => {
    mockListing();
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()), error: ref(null) });
    useJobsMock.mockReturnValue({ data: ref({ total: 1, pagina: 1, porPagina: 25, pegas: [buildJob()] }), error: ref(null) });
    trackMock.mockClear();

    await mountCategoryPage();

    expect(trackMock).toHaveBeenCalledWith('categoria_view', expect.objectContaining({ categoria: 'Frontend', total: 1 }));
  });

  it('tira 404 si la categoria del slug no existe', async () => {
    mockListing();
    useRouteMock.mockReturnValue({ params: { categoria: 'no-existe' }, path: '/categoria/no-existe', fullPath: '/categoria/no-existe', matched: [] });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()), error: ref(null) });

    const error = await mountCategoryPageExpectingError();

    expect(error).toMatchObject({ statusCode: 404 });
  });

  it('tira 500 si fallo la carga de meta', async () => {
    mockListing();
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useFetchMock.mockReturnValue({ data: ref(null), error: ref(new Error('fallo')) });

    const error = await mountCategoryPageExpectingError();

    expect(error).toMatchObject({ statusCode: 500 });
  });

  it('tira 500 si fallo la carga de pegas', async () => {
    mockListing();
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()), error: ref(null) });
    useJobsMock.mockReturnValue({ data: ref(null), error: ref(new Error('fallo')) });

    const error = await mountCategoryPageExpectingError();

    expect(error).toMatchObject({ statusCode: 500 });
  });
});
