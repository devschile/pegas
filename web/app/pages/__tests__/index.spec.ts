import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { Pega, PegasMeta } from '~/types/pega';

const { useJobsMock, useJobsListingMock, useFetchMock } = vi.hoisted(() => ({
  useJobsMock: vi.fn(),
  useJobsListingMock: vi.fn(),
  useFetchMock: vi.fn(),
}));
mockNuxtImport('useJobs', () => useJobsMock);
mockNuxtImport('useJobsListing', () => useJobsListingMock);
mockNuxtImport('useFetch', () => useFetchMock);

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

function buildMeta(overrides: Partial<PegasMeta> = {}): PegasMeta {
  return {
    total: 1,
    fuentes: ['getonbrd'],
    categorias: ['Frontend'],
    actualizado: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

function mockListing() {
  const query = ref('');
  const source = ref('');
  const page = ref(1);
  const nextPage = vi.fn(() => page.value++);
  const prevPage = vi.fn(() => {
    if (page.value > 1) page.value--;
  });
  useJobsListingMock.mockReturnValue({ query, source, page, filters: ref({}), nextPage, prevPage });
  return { query, source, page, nextPage, prevPage };
}

/**
 * pages/index.vue usa top-level await en <script setup>, así que su
 * setup() es asíncrono — igual que en la app real, necesita un límite
 * <Suspense> para poder montarse en el test.
 */
async function mountIndexPage() {
  const { default: IndexPage } = await import('../index.vue');
  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(IndexPage) }),
    }),
  );
  await flushPromises();
  return wrapper;
}

describe('pages/index', () => {
  it('muestra un mensaje de error', async () => {
    mockListing();
    useJobsMock.mockReturnValue({ data: ref(null), error: ref(new Error('fallo')) });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()) });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Error al cargar');
  });

  it('muestra un mensaje cuando no hay pegas en absoluto', async () => {
    mockListing();
    useJobsMock.mockReturnValue({ data: ref({ total: 0, pagina: 1, porPagina: 25, pegas: [] }), error: ref(null) });
    useFetchMock.mockReturnValue({ data: ref(buildMeta({ total: 0, categorias: [], fuentes: [] })) });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('No hay pegas aún');
  });

  it('lista las pegas y muestra los filtros cuando llegan datos', async () => {
    mockListing();
    useJobsMock.mockReturnValue({ data: ref({ total: 1, pagina: 1, porPagina: 25, pegas: [buildJob()] }), error: ref(null) });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()) });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.findComponent({ name: 'PegasFiltros' }).exists()).toBe(true);
  });

  it('muestra un mensaje cuando el filtro no matchea ninguna pega', async () => {
    mockListing();
    useJobsMock.mockReturnValue({ data: ref({ total: 0, pagina: 1, porPagina: 25, pegas: [] }), error: ref(null) });
    useFetchMock.mockReturnValue({ data: ref(buildMeta()) });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Ninguna pega coincide');
  });

  it('pagina el listado cuando hay mas de 25 resultados y hace scroll al tope', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const { page, nextPage, prevPage } = mockListing();
    useJobsMock.mockReturnValue({
      data: ref({
        total: 30,
        pagina: 1,
        porPagina: 25,
        pegas: Array.from({ length: 25 }, (_, index) => buildJob({ id: index, titulo: `Pega ${index}` })),
      }),
      error: ref(null),
    });
    useFetchMock.mockReturnValue({ data: ref(buildMeta({ total: 30 })) });

    const wrapper = await mountIndexPage();
    const pagination = wrapper.findComponent({ name: 'PegasPaginacion' });

    expect(pagination.props('totalPages')).toBe(2);
    expect(wrapper.findAllComponents({ name: 'PegaCard' })).toHaveLength(25);

    await pagination.vm.$emit('next');
    expect(nextPage).toHaveBeenCalled();
    expect(page.value).toBe(2);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    scrollToSpy.mockClear();
    await pagination.vm.$emit('prev');
    expect(prevPage).toHaveBeenCalled();
    expect(page.value).toBe(1);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    scrollToSpy.mockRestore();
  });

  it('no avanza de pagina mas alla del total', async () => {
    const { page, nextPage } = mockListing();
    page.value = 2;
    useJobsMock.mockReturnValue({
      data: ref({ total: 30, pagina: 2, porPagina: 25, pegas: Array.from({ length: 5 }, (_, i) => buildJob({ id: i })) }),
      error: ref(null),
    });
    useFetchMock.mockReturnValue({ data: ref(buildMeta({ total: 30 })) });

    const wrapper = await mountIndexPage();
    const pagination = wrapper.findComponent({ name: 'PegasPaginacion' });

    await pagination.vm.$emit('next');

    expect(nextPage).not.toHaveBeenCalled();
  });
});
