import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import type { Pega } from '~/types/pega';

const { usePegasMock } = vi.hoisted(() => ({
  usePegasMock: vi.fn(),
}));
mockNuxtImport('usePegas', () => usePegasMock);

const pega: Pega = {
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
};

// pages/index.vue usa top-level await en <script setup>, asi que su
// setup() es asincrono -- igual que en la app real, necesita un limite
// <Suspense> para poder montarse en el test.
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
  it('muestra el estado de carga', async () => {
    usePegasMock.mockReturnValue({ data: ref(null), status: ref('pending'), error: ref(null) });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Cargando pegas');
  });

  it('muestra un mensaje de error', async () => {
    usePegasMock.mockReturnValue({
      data: ref(null),
      status: ref('error'),
      error: ref(new Error('fallo')),
    });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('No se pudieron cargar');
  });

  it('muestra un mensaje cuando no hay pegas', async () => {
    usePegasMock.mockReturnValue({
      data: ref({ pegas: [] }),
      status: ref('success'),
      error: ref(null),
    });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('No hay pegas disponibles');
  });

  it('lista las pegas cuando llegan datos', async () => {
    usePegasMock.mockReturnValue({
      data: ref({ pegas: [pega] }),
      status: ref('success'),
      error: ref(null),
    });

    const wrapper = await mountIndexPage();

    expect(wrapper.text()).toContain('Frontend Developer');
  });
});
