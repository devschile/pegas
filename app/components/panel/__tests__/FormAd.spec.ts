import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import FormAd from '../FormAd.vue';

const crearAd = vi.fn().mockResolvedValue({});
const actualizarAd = vi.fn().mockResolvedValue({});
const subirImagen = vi.fn().mockResolvedValue({ url: 'https://utfs.io/f/x.png', nombre: 'x' });
mockNuxtImport('useAdsAdmin', () => () => ({ crearAd, actualizarAd, subirImagen }));

const empresas = [
  { id: 1, nombre: 'devsChile', activo: true },
  { id: 2, nombre: 'Anunciante Pausado', activo: false },
];

const montar = (ad: Record<string, unknown> | null = null) =>
  mount(FormAd, { props: { empresas, ad } });

/** Rellena el estado interno como lo haría la persona escribiendo. */
function llenar(w: ReturnType<typeof montar>, campos: Record<string, unknown>) {
  Object.assign((w.vm as unknown as { form: Record<string, unknown> }).form, campos);
  return w.vm.$nextTick();
}

beforeEach(() => {
  crearAd.mockClear();
  actualizarAd.mockClear();
  subirImagen.mockClear();
});

describe('FormAd — armado del cuerpo', () => {
  it('un ad de imagen manda las dos imágenes y el alt, y ningún html', async () => {
    const w = montar();
    await llenar(w, {
      nombre: 'Campaña',
      formato: 'imagen',
      imagen_desktop_url: '  https://cdn.invalid/d.png  ',
      imagen_movil_url: 'https://cdn.invalid/m.png',
      alt: 'Contrata',
      link: 'https://ejemplo.invalid',
      ubicaciones: ['header'],
    });
    await w.find('form').trigger('submit');

    const cuerpo = crearAd.mock.calls[0][0];
    expect(cuerpo.imagen_desktop_url).toBe('https://cdn.invalid/d.png');
    expect(cuerpo.imagen_movil_url).toBe('https://cdn.invalid/m.png');
    expect(cuerpo.alt).toBe('Contrata');
    expect(cuerpo).not.toHaveProperty('html');
  });

  it('un ad de html manda el html y ninguna imagen', async () => {
    const w = montar();
    await llenar(w, { nombre: 'Pieza', formato: 'html', html: '<div>x</div>', ubicaciones: ['listado'] });
    await w.find('form').trigger('submit');

    const cuerpo = crearAd.mock.calls[0][0];
    expect(cuerpo.html).toBe('<div>x</div>');
    expect(cuerpo).not.toHaveProperty('imagen_desktop_url');
    expect(cuerpo).not.toHaveProperty('alt');
  });

  it('un alto vacío viaja como null, no como cero ni cadena', async () => {
    const w = montar();
    await llenar(w, { formato: 'html', html: '<x/>', alto_desktop: '', alto_movil: '56' });
    await w.find('form').trigger('submit');

    expect(crearAd.mock.calls[0][0].alto_desktop).toBeNull();
    expect(crearAd.mock.calls[0][0].alto_movil).toBe(56);
  });

  it('un link vacío viaja como null', async () => {
    const w = montar();
    await llenar(w, { formato: 'html', html: '<x/>', link: '   ' });
    await w.find('form').trigger('submit');
    expect(crearAd.mock.calls[0][0].link).toBeNull();
  });

  it('un ad nuevo nace apagado', async () => {
    const w = montar();
    await llenar(w, { formato: 'html', html: '<x/>' });
    await w.find('form').trigger('submit');
    expect(crearAd.mock.calls[0][0].activo).toBe(false);
  });
});

describe('FormAd — edición', () => {
  const existente = {
    id: 9,
    empresa_id: 2,
    nombre: 'Vieja',
    formato: 'html',
    html: '<p>x</p>',
    alto_desktop: 56,
    alto_movil: null,
    link: null,
    activo: true,
    ubicaciones: ['footer'],
  };

  it('carga los valores del ad que se está editando', () => {
    const w = montar(existente);
    const form = (w.vm as unknown as { form: Record<string, unknown> }).form;
    expect(form.nombre).toBe('Vieja');
    expect(form.formato).toBe('html');
    expect(form.activo).toBe(true);
    expect(form.ubicaciones).toEqual(['footer']);
    expect(form.alto_movil).toBe('');
  });

  it('actualiza en vez de crear, con el id correcto', async () => {
    const w = montar(existente);
    await w.find('form').trigger('submit');
    expect(crearAd).not.toHaveBeenCalled();
    expect(actualizarAd).toHaveBeenCalledWith(9, expect.objectContaining({ nombre: 'Vieja' }));
  });

  it('el título distingue crear de editar', () => {
    expect(montar().text()).toContain('Nuevo ad');
    expect(montar(existente).text()).toContain('Editar ad');
  });
});

describe('FormAd — errores', () => {
  it('muestra el motivo que manda el servidor, no un mensaje genérico', async () => {
    crearAd.mockRejectedValueOnce({ data: { message: 'un ad de imagen necesita link' } });
    const w = montar();
    await llenar(w, { formato: 'html', html: '<x/>' });
    await w.find('form').trigger('submit');
    await w.vm.$nextTick();
    expect(w.text()).toContain('un ad de imagen necesita link');
  });

  it('si el error no trae motivo, avisa igual', async () => {
    crearAd.mockRejectedValueOnce(new Error('boom'));
    const w = montar();
    await llenar(w, { formato: 'html', html: '<x/>' });
    await w.find('form').trigger('submit');
    await w.vm.$nextTick();
    expect(w.find('[role="alert"]').text()).toBe('No se pudo guardar');
  });
});

describe('FormAd — ubicaciones', () => {
  it('marca y desmarca sin duplicar', async () => {
    const w = montar();
    const casillas = w.findAll('.form-ad__ubicacion input');
    // header, listado, footer y la página de la pega.
    expect(casillas).toHaveLength(4);

    await casillas[0]!.trigger('change');
    await casillas[2]!.trigger('change');
    const form = (w.vm as unknown as { form: { ubicaciones: string[] } }).form;
    expect(form.ubicaciones).toEqual(['header', 'footer']);

    await casillas[0]!.trigger('change');
    expect(form.ubicaciones).toEqual(['footer']);

    await casillas[3]!.trigger('change');
    expect(form.ubicaciones).toEqual(['footer', 'pega']);
  });

  it('avisa cuál empresa está apagada al elegirla', () => {
    const w = montar();
    const opciones = (w.vm as unknown as { opcionesEmpresa: { label: string }[] }).opcionesEmpresa;
    expect(opciones.map(o => o.label)).toEqual(['devsChile', 'Anunciante Pausado (apagada)']);
  });
});

describe('FormAd — subida de imagen', () => {
  /** Simula que la persona eligió un archivo en el input nativo. */
  function elegir(w: ReturnType<typeof montar>, indice: number) {
    const input = w.findAll('.form-ad__subir input')[indice]!;
    Object.defineProperty(input.element, 'files', {
      value: [new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' })],
      configurable: true,
    });
    return input.trigger('change');
  }

  it('sube el archivo y rellena la URL con la que devuelve el servidor', async () => {
    subirImagen.mockResolvedValueOnce({ url: 'https://utfs.io/f/abc.png', nombre: 'ad-1-x.png' });
    const w = montar();
    await elegir(w, 0);
    await flushPromises();

    expect(subirImagen).toHaveBeenCalledWith(expect.any(File));
    expect((w.vm as unknown as { form: Record<string, unknown> }).form.imagen_desktop_url)
      .toBe('https://utfs.io/f/abc.png');
  });

  it('cada botón rellena su propio campo', async () => {
    subirImagen.mockResolvedValueOnce({ url: 'https://utfs.io/f/movil.png', nombre: 'x' });
    const w = montar();
    await elegir(w, 1);
    await flushPromises();

    const form = (w.vm as unknown as { form: Record<string, unknown> }).form;
    expect(form.imagen_movil_url).toBe('https://utfs.io/f/movil.png');
    expect(form.imagen_desktop_url).toBe('');
  });

  it('muestra el motivo del rechazo, que es lo que explica qué archivo sirve', async () => {
    subirImagen.mockRejectedValueOnce({ data: { message: 'el archivo no es una imagen PNG, JPEG, GIF o WebP' } });
    const w = montar();
    await elegir(w, 0);
    await flushPromises();
    expect(w.text()).toContain('no es una imagen PNG');
  });

  it('el formato html no ofrece subida de imágenes', async () => {
    const w = montar();
    await llenar(w, { formato: 'html' });
    expect(w.findAll('.form-ad__subir')).toHaveLength(0);
  });
});
