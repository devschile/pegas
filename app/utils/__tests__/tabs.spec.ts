import { describe, expect, it } from 'vitest';
import { pestanaDelEvento } from '../tabs';

const TABS = ['guardadas', 'desactivadas', 'ads'];

/** Un evento ya despachado: `currentTarget` se decide al escucharlo. */
function evento(detail: unknown, target: object, currentTarget: object) {
  return { detail, target, currentTarget } as unknown as Event;
}

describe('pestanaDelEvento', () => {
  const tabs = {};

  it('acepta el cambio que emite el propio ch-tabs', () => {
    expect(pestanaDelEvento(evento('ads', tabs, tabs), TABS)).toBe('ads');
  });

  /**
   * La regresión: escribir una URL en el formulario de ads la mandaba a
   * `?tab=`, la pestaña dejaba de coincidir y el panel se desmontaba.
   */
  it('ignora el ch-change de un campo de adentro', () => {
    const campo = {};
    expect(pestanaDelEvento(evento('https://cdn.invalid/b.png', campo, tabs), TABS)).toBeNull();
  });

  it('ignora un campo aunque su valor coincida con una pestaña', () => {
    expect(pestanaDelEvento(evento('ads', {}, tabs), TABS)).toBeNull();
  });

  it('ignora un valor que no es ninguna pestaña', () => {
    expect(pestanaDelEvento(evento('publicitar', tabs, tabs), TABS)).toBeNull();
  });

  it('ignora un detail que ni siquiera es texto', () => {
    for (const d of [false, 0, null, undefined, { tab: 'ads' }]) {
      expect(pestanaDelEvento(evento(d, tabs, tabs), TABS)).toBeNull();
    }
  });
});
