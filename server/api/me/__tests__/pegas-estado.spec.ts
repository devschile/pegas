// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseIdsParam } from '../pegas-estado.get';

describe('parseIdsParam', () => {
  it('parsea una lista separada por comas', () => {
    expect(parseIdsParam('1,2,3')).toEqual([1, 2, 3]);
  });

  it('descarta valores no numéricos', () => {
    expect(parseIdsParam('1,abc,3')).toEqual([1, 3]);
  });

  it('devuelve vacío para undefined', () => {
    expect(parseIdsParam(undefined)).toEqual([]);
  });

  it('devuelve vacío para string vacío', () => {
    expect(parseIdsParam('')).toEqual([]);
  });

  it('usa el primer valor si getQuery devuelve un array', () => {
    expect(parseIdsParam(['1,2', '3'])).toEqual([1, 2]);
  });
});
