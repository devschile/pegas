// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSavedBody } from '../guardado.post';

describe('parseSavedBody', () => {
  it('acepta true', () => {
    expect(parseSavedBody({ guardada: true })).toBe(true);
  });

  it('acepta false', () => {
    expect(parseSavedBody({ guardada: false })).toBe(false);
  });

  it('rechaza un valor no booleano', () => {
    expect(parseSavedBody({ guardada: 'true' })).toBeUndefined();
  });

  it('rechaza un body sin la clave guardada', () => {
    expect(parseSavedBody({})).toBeUndefined();
  });

  it('rechaza un body que no es un objeto', () => {
    expect(parseSavedBody(undefined)).toBeUndefined();
  });
});
