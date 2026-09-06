import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TerminalMarquee from '../TerminalMarquee.vue';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn() })));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('TerminalMarquee', () => {
  it('es decorativa y no la lee un lector de pantalla', () => {
    expect(mount(TerminalMarquee).attributes('aria-hidden')).toBe('true');
  });

  it('monta un carril por velocidad, cada uno con su tono', () => {
    const carriles = mount(TerminalMarquee).findAll('[data-carril]');
    expect(carriles).toHaveLength(4);
    const tonos = carriles.map(c => c.attributes('style'));
    expect(new Set(tonos).size).toBe(4);
  });

  it('pinta el cabezal en video inverso desde el primer fotograma', () => {
    // Importa que el PRIMER fotograma pinte: con prefers-reduced-motion es el
    // unico que se llama, y una marquesina en blanco seria peor que ninguna.
    const carriles = mount(TerminalMarquee).findAll('[data-carril]');
    for (const c of carriles) {
      expect(c.element.innerHTML).toContain('<b>');
      expect(c.text().length).toBeGreaterThan(10);
    }
  });

  /**
   * El carril se pinta con innerHTML, asi que solo pueden aparecer las tres
   * etiquetas del efecto. Cualquier otra seria marcado colandose.
   */
  it('solo emite las etiquetas del efecto', () => {
    const interior = mount(TerminalMarquee).find('[data-carril]').element.innerHTML;
    const etiquetas = [...interior.matchAll(/<\/?([a-z]+)/g)].map(m => m[1]);
    expect(etiquetas.length).toBeGreaterThan(0);
    // Subconjunto y no igualdad: cuales aparecen depende de donde este el
    // cabezal en ese instante, pero ninguna otra etiqueta puede colarse.
    for (const t of etiquetas) expect(['b', 'u', 'i']).toContain(t);
  });
});
