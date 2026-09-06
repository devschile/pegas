// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseAdId } from '../parse-id';

describe('parseAdId', () => {
  it('acepta enteros positivos', () => {
    expect(parseAdId('1')).toBe(1);
    expect(parseAdId('4207')).toBe(4207);
  });

  it('rechaza todo lo que no sea un entero positivo en base 10', () => {
    for (const raw of ['0', '-1', '1.5', '1e3', ' 1', '1 ', '0x10', 'abc', '', undefined,
                       '9007199254740993', "1' OR '1'='1"]) {
      expect(parseAdId(raw)).toBeNull();
    }
  });
});
