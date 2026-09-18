// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordEvent, validateEvent } from '../relacionadas-eventos';

const queryMock = vi.fn();
vi.mock('../db', () => ({ query: (...a: unknown[]) => queryMock(...a) }));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [] });
});

describe('validateEvent', () => {
  const base = { similarId: 9, posicion: 0, dispositivo: 'movil' };

  it('acepta un evento bien formado', () => {
    const r = validateEvent(base, 7, 'impresion');

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toEqual({ pegaId: 7, similarId: 9, tipo: 'impresion', posicion: 0, dispositivo: 'movil' });
  });

  it('rechaza cuerpos que no son objetos', () => {
    for (const cuerpo of [null, undefined, 'x', 42]) expect(validateEvent(cuerpo, 1, 'click').ok).toBe(false);
  });

  it('rechaza un similarId que no es un entero positivo', () => {
    for (const similarId of [0, -1, 1.5, '9', undefined, NaN]) {
      expect(validateEvent({ ...base, similarId }, 1, 'click').ok).toBe(false);
    }
  });

  /** Una pega no es similar a sí misma; si llega eso, el cliente está roto o probando. */
  it('rechaza que la pega se apunte a sí misma', () => {
    expect(validateEvent({ ...base, similarId: 7 }, 7, 'click').ok).toBe(false);
  });

  it('rechaza posiciones fuera del bloque', () => {
    for (const posicion of [-1, 10, 1.5, '0', undefined]) {
      expect(validateEvent({ ...base, posicion }, 1, 'click').ok).toBe(false);
    }
  });

  it('rechaza dispositivos inventados', () => {
    for (const dispositivo of ['tablet', '', undefined]) {
      expect(validateEvent({ ...base, dispositivo }, 1, 'click').ok).toBe(false);
    }
  });
});

describe('recordEvent', () => {
  const evento = { pegaId: 1, similarId: 2, tipo: 'click' as const, posicion: 1, dispositivo: 'desktop' as const };

  it('inserta en relacionadas_eventos', async () => {
    await recordEvent(evento);

    expect(String(queryMock.mock.calls[0][0])).toMatch(/INSERT INTO relacionadas_eventos/);
  });

  /**
   * El núcleo de la defensa: si el motivo y el score viajaran en el cuerpo,
   * cualquiera podría inflar con curl la señal que después realimenta el
   * cálculo de recomendaciones.
   */
  it('copia motivo y score de la arista real y no los acepta del cliente', async () => {
    await recordEvent(evento);

    const [sql, params] = queryMock.mock.calls[0];
    expect(String(sql)).toMatch(/SELECT s\.pega_id, s\.similar_id, \$3, \$4, s\.motivo, s\.score, \$5/);
    expect(String(sql)).toMatch(/FROM pegas_similares s/);
    expect(params).toEqual([1, 2, 'click', 1, 'desktop']);
  });

  it('no guarda IP ni user agent', async () => {
    await recordEvent(evento);

    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).not.toMatch(/\bip\b|user_agent/i);
  });
});
