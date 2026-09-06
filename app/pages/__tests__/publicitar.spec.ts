import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Publicitar from '../publicitar.vue';

/** GlyphField es decorativo y monta un rAF: no aporta nada al test. */
const montar = () =>
  mount(Publicitar, {
    global: {
      mocks: { $router: { push: () => {} } },
      stubs: { GlyphField: { template: '<div data-test="glyph" />' } },
    },
  });

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

  it('el esquema del sitio marca los tres espacios', () => {
    const w = montar();
    const slots = w.findAll('.pub__slot');
    expect(slots.map(s => s.text())).toEqual(['cabecera', 'entre las pegas', 'pie']);
  });

  it('pasar por una ubicación la resalta en el esquema', async () => {
    const w = montar();
    expect(w.findAll('.pub__slot--on')).toHaveLength(0);
    await w.findAll('.pub__item')[1]!.trigger('mouseenter');
    const encendidos = w.findAll('.pub__slot--on');
    expect(encendidos).toHaveLength(1);
    expect(encendidos[0]!.text()).toBe('entre las pegas');
  });

  it('el campo de glifos es decorativo y no aporta texto', () => {
    expect(montar().findAll('[data-test="glyph"]').length).toBeGreaterThan(0);
  });

  it('promete numeros del servidor, que es el diferencial', () => {
    expect(montar().text()).toContain('en el servidor');
  });
});
