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
    id: 123,
    url: 'https://example.com/pega/123',
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

async function mountDetailPage() {
  const { default: DetailPage } = await import('../[id].vue');
  const wrapper = mount(
    defineComponent({
      render: () => h(Suspense, null, { default: () => h(DetailPage) }),
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
async function mountDetailPageExpectingError() {
  const { default: DetailPage } = await import('../[id].vue');
  const capturedErrors: unknown[] = [];
  mount(
    defineComponent({ render: () => h(Suspense, null, { default: () => h(DetailPage) }) }),
    { global: { config: { errorHandler: error => { capturedErrors.push(error); } } } },
  );
  await flushPromises();
  return capturedErrors[0];
}

describe('pages/pega/[id]', () => {
  it('muestra la pega cuando el id del slug matchea', async () => {
    useRouteMock.mockReturnValue({ params: { id: '123-frontend-developer-acme' } });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });

    const wrapper = await mountDetailPage();

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.text()).toContain('Acme');
  });

  it('trackea pega_view_detail al montar', async () => {
    useRouteMock.mockReturnValue({ params: { id: '123-frontend-developer-acme' } });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });
    trackMock.mockClear();

    await mountDetailPage();

    expect(trackMock).toHaveBeenCalledWith(
      'pega_view_detail',
      expect.objectContaining({ pega_id: 123 }),
    );
  });

  it('al hacer click en "Ver oferta original" abre el aviso y trackea el evento', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    useRouteMock.mockReturnValue({ params: { id: '123-frontend-developer-acme' } });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });
    trackMock.mockClear();

    const wrapper = await mountDetailPage();
    await wrapper.findComponent('.pega-detalle__apply').vm.$emit('ch-click');

    expect(openSpy).toHaveBeenCalledWith('https://example.com/pega/123', '_blank', 'noopener,noreferrer');
    expect(trackMock).toHaveBeenCalledWith(
      'pega_click_apply',
      expect.objectContaining({ pega_id: 123, empleador: 'Acme' }),
    );

    openSpy.mockRestore();
  });

  it('tira 404 si el id del slug no matchea ninguna pega', async () => {
    useRouteMock.mockReturnValue({ params: { id: '999-no-existe' } });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });

    const error = await mountDetailPageExpectingError();

    expect(error).toMatchObject({ statusCode: 404 });
  });

  it('tira 404 si el slug no empieza con un id numerico', async () => {
    useRouteMock.mockReturnValue({ params: { id: 'sin-id' } });
    useJobsMock.mockReturnValue({ data: ref(buildJobsData()), error: ref(null) });

    const error = await mountDetailPageExpectingError();

    expect(error).toMatchObject({ statusCode: 404 });
  });

  it('tira 500 si fallo la carga de datos', async () => {
    useRouteMock.mockReturnValue({ params: { id: '123-frontend-developer-acme' } });
    useJobsMock.mockReturnValue({ data: ref(null), error: ref(new Error('fallo')) });

    const error = await mountDetailPageExpectingError();

    expect(error).toMatchObject({ statusCode: 500 });
  });
});
