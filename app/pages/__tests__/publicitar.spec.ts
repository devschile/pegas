import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Publicitar from '../publicitar.vue';

/** Las piezas ASCII son decorativas y montan un rAF: no aportan al test. */
const montar = () =>
  mount(Publicitar, {
    global: {
      mocks: { $router: { push: () => {} } },
      stubs: {
        GlyphField: { template: '<div data-test="glyph" />' },
        AsciiFill: { template: '<div data-test="ascii" />' },
      },
    },
  });

describe('pages/publicitar', () => {
  it('describe las tres ubicaciones con sus medidas', () => {
    const t = montar().text();
    for (const titulo of ['Cabecera', 'Entre las pegas', 'Pie']) expect(t).toContain(titulo);
    expect(t).toContain('970 × 90');
    expect(t).toContain('320 × 100');
  });

  /**
   * Sin fijar las cifras: son copia y se ajustan. Lo que no puede desaparecer
   * es que los dos formatos estén y que cada uno diga sus límites.
   */
  it('explica los dos formatos, cada uno con sus límites', () => {
    const w = montar();
    const t = w.text();
    expect(t).toContain('Una imagen');
    expect(t).toContain('Tu propio HTML');
    expect(w.findAll('.pub__caja .pub__mono')).toHaveLength(2);
  });

  /**
   * La CSP del sobre permite `img-src https:`, o sea los píxeles de
   * seguimiento SÍ funcionan; lo que se bloquea son los scripts externos.
   * Prometer "sin trackers" seria falso y esto lo impide.
   */
  it('no promete bloquear trackers, solo scripts de terceros', () => {
    const t = montar().text();
    expect(t).toContain('scripts de terceros');
    expect(t).not.toMatch(/tampoco puede cargar trackers/);
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
    const href = montar().find('a.glyph-btn[href^="mailto:"]').attributes('href')!;
    expect(href).toContain('subject=');
    expect(href).toContain('body=');
  });

  it('los esquemas marcan los cuatro espacios, en sus dos pantallas', () => {
    const w = montar();
    const etiquetas = w.findAll('.pub__slot span');
    expect(etiquetas.map(s => s.text())).toEqual([
      'cabecera',
      'entre las pegas',
      'pie',
      'en el aviso',
    ]);
    // La cuarta vive en otra pantalla, asi que va en su propio esquema.
    expect(w.findAll('.pub__esquema')).toHaveLength(2);
  });

  it('cada espacio del esquema lleva su textura animada', () => {
    expect(montar().findAll('.pub__slot [data-test="ascii"]')).toHaveLength(4);
  });

  it('la lista describe las cuatro ubicaciones', () => {
    expect(montar().findAll('.pub__item')).toHaveLength(4);
  });

  it('pasar por una ubicación la resalta en el esquema', async () => {
    const w = montar();
    expect(w.findAll('.pub__slot--on')).toHaveLength(0);
    await w.findAll('.pub__item')[1]!.trigger('mouseenter');
    const encendidos = w.findAll('.pub__slot--on');
    expect(encendidos).toHaveLength(1);
    expect(encendidos[0]!.find('span').text()).toBe('entre las pegas');
  });

  it('el campo de glifos es decorativo y no aporta texto', () => {
    expect(montar().findAll('[data-test="glyph"]').length).toBeGreaterThan(0);
  });

  it('promete numeros del servidor, que es el diferencial', () => {
    expect(montar().text()).toContain('en el servidor');
  });
});
