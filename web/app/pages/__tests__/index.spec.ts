import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { Pega, PegasData } from '~/types/pega';

const { useJobsMock } = vi.hoisted(() => ({
  useJobsMock: vi.fn(),
}));
mockNuxtImport('useJobs', () => useJobsMock);

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
    total: 1,
    fuentes: ['getonbrd'],
    categorias: ['Frontend'],
    actualizado: '2026-08-15T00:00:00.000Z',
    pegas: [buildJob()],
    ...overrides,
  };
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
    useJobsMock.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('fallo')),
    });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Error al cargar');
  });

  it('muestra un mensaje cuando no hay pegas en absoluto', async () => {
    useJobsMock.mockReturnValue({
      data: ref(buildJobsData({ pegas: [], categorias: [], fuentes: [] })),
      status: ref('success'),
      error: ref(null),
    });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('No hay pegas aún');
  });

  it('lista las pegas y muestra los filtros cuando llegan datos', async () => {
    useJobsMock.mockReturnValue({
      data: ref(buildJobsData()),
      status: ref('success'),
      error: ref(null),
    });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.findComponent({ name: 'PegasFiltros' }).exists()).toBe(true);
  });

  it('muestra un mensaje cuando el filtro no matchea ninguna pega', async () => {
    useJobsMock.mockReturnValue({
      data: ref(buildJobsData()),
      status: ref('success'),
      error: ref(null),
    });

    const wrapper = await mountIndexPage();
    const filters = wrapper.findComponent({ name: 'PegasFiltros' });
    await filters.vm.$emit('update:query', 'esto no matchea con nada');
    await flushPromises();

    expect(wrapper.text()).toContain('Ninguna pega coincide');
  });

  it('pagina el listado cuando hay mas de 25 resultados y hace scroll al tope', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    useJobsMock.mockReturnValue({
      data: ref(
        buildJobsData({
          pegas: Array.from({ length: 30 }, (_, index) => buildJob({ id: index, titulo: `Pega ${index}` })),
          total: 30,
        }),
      ),
      status: ref('success'),
      error: ref(null),
    });

    const wrapper = await mountIndexPage();
    const pagination = wrapper.findComponent({ name: 'PegasPaginacion' });

    expect(pagination.props('totalPages')).toBe(2);
    expect(wrapper.findAllComponents({ name: 'PegaCard' })).toHaveLength(25);

    await pagination.vm.$emit('next');
    await flushPromises();

    expect(wrapper.findAllComponents({ name: 'PegaCard' })).toHaveLength(5);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    scrollToSpy.mockClear();
    await pagination.vm.$emit('prev');
    await flushPromises();

    expect(wrapper.findAllComponents({ name: 'PegaCard' })).toHaveLength(25);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    scrollToSpy.mockRestore();
  });
});
