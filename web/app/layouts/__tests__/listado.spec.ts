import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { PegasMeta } from '~/types/pega';

const { useJobsListingMock, useFetchMock, useRouteMock, trackMock } = vi.hoisted(() => ({
  useJobsListingMock: vi.fn(),
  useFetchMock: vi.fn(),
  useRouteMock: vi.fn(),
  trackMock: vi.fn(),
}));
mockNuxtImport('useJobsListing', () => useJobsListingMock);
mockNuxtImport('useFetch', () => useFetchMock);
mockNuxtImport('useRoute', () => useRouteMock);
mockNuxtImport('useTrackEvent', () => () => trackMock);

function buildMeta(overrides: Partial<PegasMeta> = {}): PegasMeta {
  return {
    total: 834,
    fuentes: ['getonbrd', 'linkedin'],
    categorias: ['Frontend', 'Backend'],
    actualizado: '2026-08-19T00:00:00.000Z',
    ...overrides,
  };
}

const queryRef = ref('');
const sourceRef = ref('');

function mockListing() {
  queryRef.value = '';
  sourceRef.value = '';
  useJobsListingMock.mockReturnValue({
    query: queryRef,
    source: sourceRef,
    page: ref(1),
    filters: ref({ q: '', categoria: '', fuente: '', pagina: 1 }),
    nextPage: vi.fn(),
    prevPage: vi.fn(),
  });
}

async function mountLayout() {
  const { default: ListadoLayout } = await import('../listado.vue');
  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(ListadoLayout, null, { default: () => h('div', 'contenido') }) }),
    }),
  );
  await flushPromises();
  return wrapper;
}

/** /api/meta responde `meta`, /api/pegas (el conteo propio del layout) responde `count`. */
function mockFetches(meta: PegasMeta, count = 0) {
  useFetchMock.mockImplementation((url: string) => {
    if (url === '/api/pegas') return { data: ref({ total: count, pagina: 1, porPagina: 1, pegas: [] }) };
    return { data: ref(meta) };
  });
}

describe('layouts/listado', () => {
  beforeEach(() => {
    mockListing();
    useRouteMock.mockReturnValue({ params: {}, path: '/', fullPath: '/', matched: [] });
    mockFetches(buildMeta(), 416);
  });

  it('renderiza el slot (contenido de la pagina)', async () => {
    const wrapper = await mountLayout();

    expect(wrapper.text()).toContain('contenido');
  });

  it('pasa las fuentes, el total general y el total visible a PegasFiltros', async () => {
    const wrapper = await mountLayout();

    const filtros = wrapper.findComponent({ name: 'PegasFiltros' });
    expect(filtros.props('sources')).toEqual(['getonbrd', 'linkedin']);
    expect(filtros.props('totalGeneral')).toBe(834);
    expect(filtros.props('totalVisible')).toBe(416);
  });

  it('pide su propio conteo a /api/pegas (no depende de que la pagina se lo pase)', async () => {
    mockFetches(buildMeta(), 125);

    const wrapper = await mountLayout();

    expect(wrapper.findComponent({ name: 'PegasFiltros' }).props('totalVisible')).toBe(125);
  });

  it('sin categoria en la ruta: CategoriasNav no tiene activa ninguna', async () => {
    const wrapper = await mountLayout();

    expect(wrapper.findComponent({ name: 'CategoriasNav' }).props('active')).toBeUndefined();
  });

  it('con categoria en la ruta: resalta esa categoria en CategoriasNav', async () => {
    useRouteMock.mockReturnValue({ params: { categoria: 'frontend' }, path: '/categoria/frontend', fullPath: '/categoria/frontend', matched: [] });

    const wrapper = await mountLayout();

    expect(wrapper.findComponent({ name: 'CategoriasNav' }).props('active')).toBe('Frontend');
  });

  it('reset (click en "Todos" de CategoriasNav) limpia query y fuente', async () => {
    queryRef.value = 'react';
    sourceRef.value = 'linkedin';
    const wrapper = await mountLayout();

    await wrapper.findComponent({ name: 'CategoriasNav' }).vm.$emit('reset');

    expect(queryRef.value).toBe('');
    expect(sourceRef.value).toBe('');
  });
});
