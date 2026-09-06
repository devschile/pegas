import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Publicitar from '../publicitar.vue';

const montar = () => mount(Publicitar, { global: { mocks: { $router: { push: () => {} } } } });

describe('pages/publicitar', () => {
  it('describe las tres ubicaciones con sus medidas', () => {
    const t = montar().text();
    for (const titulo of ['Cabecera', 'Entre las pegas', 'Pie']) expect(t).toContain(titulo);
    expect(t).toContain('970 × 90');
    expect(t).toContain('320 × 100');
  });

  it('explica los dos formatos y sus límites', () => {
    const t = montar().text();
    expect(t).toContain('Una imagen');
    expect(t).toContain('Tu propio HTML');
    expect(t).toContain('2 MB');
    expect(t).toContain('600 px');
  });

  /**
   * Este repositorio es público y una tarifa cambia cuando se renegocia un
   * acuerdo: los valores se conversan por correo, no se publican acá.
   */
  it('no publica precios', () => {
    const t = montar().text();
    expect(t).not.toMatch(/\$\s?\d|UF\s?\d|\d+\s?(USD|CLP)/);
    expect(t).toContain('los conversamos directo');
  });

  it('el contacto es un mailto con asunto y cuerpo preparados', () => {
    const href = montar().find('ch-button[href^="mailto:"]').attributes('href')!;
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
  });

  it('promete numeros del servidor, que es el diferencial', () => {
    expect(montar().text()).toContain('en el servidor');
  });
});
