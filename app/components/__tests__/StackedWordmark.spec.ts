import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import StackedWordmark from '../StackedWordmark.vue';

describe('StackedWordmark', () => {
  it('una fila por línea y una celda por letra', () => {
    const w = mount(StackedWordmark, { props: { lineas: ['devs', 'Chile'] } });
    const filas = w.findAll('.wordmark__linea');
    expect(filas).toHaveLength(2);
    expect(filas[0]!.findAll('.wordmark__celda').map(c => c.text())).toEqual(['d', 'e', 'v', 's']);
    expect(filas[1]!.findAll('.wordmark__celda')).toHaveLength(5);
  });

  it('cada línea toma un tono distinto de la rampa', () => {
    const filas = mount(StackedWordmark).findAll('.wordmark__linea');
    expect(new Set(filas.map(f => f.attributes('style'))).size).toBe(filas.length);
  });

  /**
   * No es decoración: dice el nombre. Las celdas se ocultan del lector de
   * pantalla —leerlas letra por letra seria ruido— y el nombre va aparte.
   */
  it('el nombre queda legible para un lector de pantalla', () => {
    const w = mount(StackedWordmark, { props: { lineas: ['devs', 'Chile'] } });
    expect(w.find('.wordmark__texto').text()).toBe('devsChile');
    for (const f of w.findAll('.wordmark__linea')) {
      expect(f.attributes('aria-hidden')).toBe('true');
    }
  });

  it('por defecto es la marca del sitio', () => {
    expect(mount(StackedWordmark).find('.wordmark__texto').text()).toBe('devsChile');
  });
});
