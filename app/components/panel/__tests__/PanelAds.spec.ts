import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import PanelAds from '../PanelAds.vue';
import FormAd from '../FormAd.vue';

const { useFetchMock } = vi.hoisted(() => ({ useFetchMock: vi.fn() }));
mockNuxtImport('useFetch', () => useFetchMock);

const api = {
  actualizarAd: vi.fn().mockResolvedValue({}),
  borrarAd: vi.fn().mockResolvedValue({}),
  crearAd: vi.fn().mockResolvedValue({}),
  crearEmpresa: vi.fn().mockResolvedValue({}),
  actualizarEmpresa: vi.fn().mockResolvedValue({}),
};
mockNuxtImport('useAdsAdmin', () => () => api);

const refrescar = vi.fn().mockResolvedValue(undefined);

const adBase = {
  id: 1,
  empresa_id: 1,
  nombre: 'Cabecera comprada',
  formato: 'imagen',
  activo: true,
  ubicaciones: ['header'],
  empresa_nombre: 'Ñandú Software',
  empresa_activa: true,
  es_casa: false,
};

const empresaBase = {
  id: 1,
  nombre: 'Ñandú Software',
  slug: 'nandu',
  activo: true,
  es_casa: false,
  ads_total: 2,
  ads_activos: 1,
};

function mockDatos(ads: unknown[] = [adBase], empresas: unknown[] = [empresaBase], log: unknown[] = []) {
  useFetchMock.mockImplementation((url: string) => {
    const data = url === '/api/ads/admin' ? ads : url === '/api/empresas' ? empresas : log;
    return { data: ref(data), refresh: refrescar };
  });
}

async function montar() {
  const wrapper = mount(
    defineComponent({ render: () => h(Suspense, null, { default: () => h(PanelAds) }) }),
  );
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  refrescar.mockResolvedValue(undefined);
  mockDatos();
});

describe('PanelAds', () => {
  it('lista los ads con su empresa y sus ubicaciones', async () => {
    const w = await montar();
    expect(w.text()).toContain('Cabecera comprada');
    expect(w.text()).toContain('Ñandú Software');
    expect(w.text()).toContain('header');
  });

  it('avisa cuando un ad está prendido pero su empresa apagada: no se está publicando', async () => {
    mockDatos([{ ...adBase, activo: true, empresa_activa: false }]);
    const w = await montar();
    expect(w.text()).toContain('No se está publicando');
  });

  it('no avisa si el ad está apagado: ahí no hay nada que explicar', async () => {
    mockDatos([{ ...adBase, activo: false, empresa_activa: false }]);
    const w = await montar();
    expect(w.text()).not.toContain('No se está publicando');
  });

  it('marca cuál empresa es la de casa', async () => {
    mockDatos([adBase], [{ ...empresaBase, es_casa: true }]);
    expect((await montar()).text()).toContain('casa');
  });

  it('muestra cuántos ads activos tiene cada empresa', async () => {
    expect((await montar()).text()).toContain('1 de 2 ads activos');
  });

  it('sin ads lo dice, en vez de mostrar una lista vacía', async () => {
    mockDatos([]);
    expect((await montar()).text()).toContain('Todavía no hay ads');
  });

  it('el toggle manda el ad completo con activo invertido, porque el PATCH reemplaza la fila', async () => {
    const w = await montar();
    // Los eventos de chucao se emiten por el wrapper de Vue, no por el DOM.
    // El primer switch es el de la empresa; el segundo, el del ad.
    const switches = w.findAllComponents({ name: 'ChSwitch' });
    expect(switches).toHaveLength(2);
    await switches[1]!.vm.$emit('ch-change', { detail: false });
    await flushPromises();

    expect(api.actualizarAd).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1, activo: false }));
    expect(refrescar).toHaveBeenCalled();
  });

  it('borrar pide confirmación y respeta el "no"', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const w = await montar();
    await w.find('button[aria-label^="Borrar"]').trigger('click');
    await flushPromises();
    expect(api.borrarAd).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('borrar confirmado llama al endpoint y refresca', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const w = await montar();
    await w.find('button[aria-label^="Borrar"]').trigger('click');
    await flushPromises();
    expect(api.borrarAd).toHaveBeenCalledWith(1);
    expect(refrescar).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('editar abre el formulario cargado con ese ad', async () => {
    const w = await montar();
    expect(w.findComponent(FormAd).exists()).toBe(false);
    await w.find('button[aria-label^="Editar"]').trigger('click');
    expect(w.findComponent(FormAd).props('ad')).toMatchObject({ id: 1 });
  });

  it('crear empresa muestra el motivo que devuelve el servidor', async () => {
    api.crearEmpresa.mockRejectedValueOnce({ data: { message: 'slug debe ser minúsculas' } });
    const w = await montar();
    await w.find('.panel-ads__nueva').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('slug debe ser minúsculas');
  });

  it('el log muestra qué se hizo y quién', async () => {
    mockDatos([adBase], [empresaBase], [
      { id: 1, ad_id: 1, accion: 'activar', detalle: { nombre: 'Cabecera comprada' }, fecha: '2026-09-06T03:00:00Z', usuario_nombre: 'Dev Local' },
    ]);
    const w = await montar();
    expect(w.text()).toContain('activar');
    expect(w.text()).toContain('Dev Local');
  });
});
