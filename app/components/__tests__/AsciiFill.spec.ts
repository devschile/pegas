import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AsciiFill from '../AsciiFill.vue';

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

describe('AsciiFill', () => {
  it('es decorativo y no lo lee un lector de pantalla', () => {
    expect(mount(AsciiFill).attributes('aria-hidden')).toBe('true');
  });

  it('construye la grilla con las filas pedidas', () => {
    expect(mount(AsciiFill).findAll('.ascii-fill__row')).toHaveLength(3);
    expect(mount(AsciiFill, { props: { filas: 5 } }).findAll('.ascii-fill__row')).toHaveLength(5);
  });

  /** El primer fotograma tiene que traer textura: si no, la caja se ve hueca. */
  it('pinta con la rampa de sombreado desde el primer fotograma', () => {
    const filas = mount(AsciiFill).findAll('.ascii-fill__row');
    const todo = filas.map(f => f.element.textContent ?? '').join('');
    expect(todo).toMatch(/^[░▒▓ ]+$/);
    expect(todo).toMatch(/[░▒▓]/);
  });

  it('el estado activo se distingue en la clase', () => {
    expect(mount(AsciiFill, { props: { activo: true } }).classes()).toContain('ascii-fill--activo');
    expect(mount(AsciiFill).classes()).not.toContain('ascii-fill--activo');
  });
});
