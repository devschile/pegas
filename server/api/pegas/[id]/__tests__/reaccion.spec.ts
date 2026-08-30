// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseReactionBody } from '../reaccion.post';

describe('parseReactionBody', () => {
  it('acepta "like"', () => {
    expect(parseReactionBody({ reaccion: 'like' })).toBe('like');
  });

  it('acepta "dislike"', () => {
    expect(parseReactionBody({ reaccion: 'dislike' })).toBe('dislike');
  });

  it('acepta null explícito (sacar la reaccion)', () => {
    expect(parseReactionBody({ reaccion: null })).toBeNull();
  });

  it('rechaza un valor arbitrario', () => {
    expect(parseReactionBody({ reaccion: 'love' })).toBeUndefined();
  });

  it('rechaza un body sin la clave reaccion', () => {
    expect(parseReactionBody({})).toBeUndefined();
  });

  it('rechaza un body que no es un objeto', () => {
    expect(parseReactionBody(undefined)).toBeUndefined();
    expect(parseReactionBody('like')).toBeUndefined();
  });
});
