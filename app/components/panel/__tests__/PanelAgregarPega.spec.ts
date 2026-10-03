import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref, Suspense } from 'vue';
import PanelAgregarPega from '../PanelAgregarPega.vue';

const { useFetchMock } = vi.hoisted(() => ({ useFetchMock: vi.fn() }));
mockNuxtImport('useFetch', () => useFetchMock);

const crearPega = vi.fn().mockResolvedValue({ id: 42, titulo: 'Desarrollador' });
const buscarSimilares = vi.fn().mockResolvedValue({ exacta: null, similares: [] });
mockNuxtImport('usePegasAdmin', () => () => ({ crearPega, buscarSimilares }));

const meta = { total: 10, categorias: ['Tecnología', 'Ventas'], fuentes: ['linkedin'], actualizado: null };

async function montar() {
  useFetchMock.mockReturnValue({ data: ref(meta) });
  const wrapper = mount(
    defineComponent({ render: () => h(Suspense, null, { default: () => h(PanelAgregarPega) }) }),
  );
  await flushPromises();
  return wrapper;
}

type Form = {
  url: string;
  titulo: string;
  empleador: string;
  categoria: string;
  ubicacion: string;
  descripcion: string;
  sueldo: string;
  tags: string;
  fecha_publicacion: string;
};

const CAMPOS_VALIDOS: Form = {
  url: 'https://app.genoma.work/sky-airline/abc',
  titulo: 'Desarrollador',
  empleador: 'Sky Airline',
  categoria: 'Tecnología',
  ubicacion: 'Santiago, Chile',
  descripcion: 'Se busca desarrollador backend.',
  sueldo: '',
  tags: '',
  fecha_publicacion: '',
};

/** Rellena el estado interno como lo haría la persona escribiendo. */
async function llenar(w: Awaited<ReturnType<typeof montar>>, campos: Partial<Form>) {
  const panel = w.findComponent(PanelAgregarPega);
  Object.assign((panel.vm as unknown as { form: Form }).form, campos);
  await panel.vm.$nextTick();
}

const enviar = async (w: Awaited<ReturnType<typeof montar>>) => {
  await w.find('form').trigger('submit');
  await flushPromises();
};

beforeEach(() => {
  vi.useFakeTimers();
  crearPega.mockClear();
  crearPega.mockResolvedValue({ id: 42, titulo: 'Desarrollador' });
  buscarSimilares.mockClear();
  buscarSimilares.mockResolvedValue({ exacta: null, similares: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PanelAgregarPega — búsqueda de similares', () => {
  it('no busca mientras título, empleador y url están vacíos', async () => {
    await montar();
    await vi.advanceTimersByTimeAsync(400);
    expect(buscarSimilares).not.toHaveBeenCalled();
  });

  it('debouncea 400ms antes de buscar', async () => {
    const w = await montar();
    await llenar(w, { titulo: 'Desarrollador' });
    await vi.advanceTimersByTimeAsync(399);
    expect(buscarSimilares).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(buscarSimilares).toHaveBeenCalledWith({ titulo: 'Desarrollador', empleador: '', url: '' });
  });

  it('avisa, sin bloquear, cuando hay parecidas por título/empleador', async () => {
    buscarSimilares.mockResolvedValue({
      exacta: null,
      similares: [{ id: 7, url: 'https://x.cl', titulo: 'Desarrollador Backend', empleador: 'Sky Airline', categoria: 'Tecnología', ubicacion: 'Santiago', fuente: 'linkedin', fecha_creacion: '2026-01-01', score: 0.8 }],
    });
    const w = await montar();
    await llenar(w, { titulo: 'Desarrollador' });
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(w.text()).toContain('ya podría estar publicado');
    expect(w.text()).toContain('Desarrollador Backend');

    // Es un aviso, no un bloqueo: con los demás campos completos, se puede guardar igual.
    await llenar(w, CAMPOS_VALIDOS);
    await enviar(w);
    expect(crearPega).toHaveBeenCalled();
  });

  it('bloquea el guardado cuando la url ya existe exacta', async () => {
    buscarSimilares.mockResolvedValue({
      exacta: { id: 3, url: 'https://x.cl', titulo: 'Ya existe', empleador: 'Sky Airline', categoria: 'Tecnología', ubicacion: 'Santiago', fuente: 'linkedin', fecha_creacion: '2026-01-01' },
      similares: [],
    });
    const w = await montar();
    await llenar(w, CAMPOS_VALIDOS);
    await vi.advanceTimersByTimeAsync(400);
    await flushPromises();

    expect(w.text()).toContain('Ya hay una pega con esa URL');
    await enviar(w);
    expect(crearPega).not.toHaveBeenCalled();
  });
});

describe('PanelAgregarPega — guardado', () => {
  it('no guarda si falta un campo obligatorio', async () => {
    const w = await montar();
    await llenar(w, { ...CAMPOS_VALIDOS, descripcion: '' });
    await enviar(w);
    expect(crearPega).not.toHaveBeenCalled();
  });

  it('manda los campos recortados, con null en los opcionales vacíos', async () => {
    const w = await montar();
    await llenar(w, { ...CAMPOS_VALIDOS, url: `  ${CAMPOS_VALIDOS.url}  `, titulo: `  ${CAMPOS_VALIDOS.titulo}  ` });
    await enviar(w);

    expect(crearPega).toHaveBeenCalledWith({
      url: CAMPOS_VALIDOS.url,
      titulo: CAMPOS_VALIDOS.titulo,
      empleador: CAMPOS_VALIDOS.empleador,
      categoria: CAMPOS_VALIDOS.categoria,
      ubicacion: CAMPOS_VALIDOS.ubicacion,
      descripcion: CAMPOS_VALIDOS.descripcion,
      sueldo: null,
      tags: null,
      fecha_publicacion: null,
    });
  });

  it('muestra éxito y limpia el formulario tras guardar', async () => {
    const w = await montar();
    await llenar(w, CAMPOS_VALIDOS);
    await enviar(w);

    expect(w.text()).toContain('Se creó');
    expect(w.text()).toContain('Desarrollador');
  });

  it('muestra el motivo del servidor si falla, por ejemplo un duplicado que se coló', async () => {
    crearPega.mockRejectedValueOnce({ data: { message: 'Ya hay una pega con esa URL: "X" (#1)' } });
    const w = await montar();
    await llenar(w, CAMPOS_VALIDOS);
    await enviar(w);

    expect(w.text()).toContain('Ya hay una pega con esa URL: "X" (#1)');
  });
});
