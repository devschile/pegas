// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { linkDelAd, registrarEvento, validarEvento } from '../ads-eventos';

const queryMock = vi.fn();
vi.mock('../db', () => ({ query: (...a: unknown[]) => queryMock(...a) }));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [] });
});

describe('validarEvento', () => {
  const base = { ubicacion: 'listado', dispositivo: 'movil', posicion: 3, pagina: 2 };

  it('acepta un evento del listado con sus dimensiones', () => {
    const r = validarEvento(base, 7, 'impresion');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toEqual({ ad_id: 7, tipo: 'impresion', ubicacion: 'listado', posicion: 3, pagina: 2, dispositivo: 'movil' });
  });

  it('descarta posicion y pagina fuera del listado: el CHECK de la base las rechaza', () => {
    const r = validarEvento({ ...base, ubicacion: 'footer' }, 7, 'click');
    expect(r.ok && r.valor.posicion).toBeNull();
    expect(r.ok && r.valor.pagina).toBeNull();
  });

  it('rechaza ubicaciones y dispositivos inventados', () => {
    expect(validarEvento({ ...base, ubicacion: 'sidebar' }, 1, 'click').ok).toBe(false);
    expect(validarEvento({ ...base, dispositivo: 'tablet' }, 1, 'click').ok).toBe(false);
    expect(validarEvento({ ...base, dispositivo: undefined }, 1, 'click').ok).toBe(false);
  });

  it('rechaza cuerpos que no son objetos', () => {
    for (const b of [null, undefined, 'x', 42]) expect(validarEvento(b, 1, 'click').ok).toBe(false);
  });

  it('ignora posicion y pagina absurdas en vez de rechazar el evento entero', () => {
    const r = validarEvento({ ...base, posicion: -1, pagina: 99999 }, 1, 'impresion');
    expect(r.ok).toBe(true);
    expect(r.ok && r.valor.posicion).toBeNull();
    expect(r.ok && r.valor.pagina).toBeNull();
  });
});

describe('registrarEvento', () => {
  it('inserta con las seis dimensiones', async () => {
    await registrarEvento({ ad_id: 1, tipo: 'click', ubicacion: 'header', posicion: null, pagina: null, dispositivo: 'desktop' });
    expect(String(queryMock.mock.calls[0][0])).toMatch(/INSERT INTO ads_eventos/);
    expect(queryMock.mock.calls[0][1]).toEqual([1, 'click', 'header', null, null, 'desktop']);
  });

  it('no guarda IP ni user agent', async () => {
    await registrarEvento({ ad_id: 1, tipo: 'click', ubicacion: 'header', posicion: null, pagina: null, dispositivo: 'desktop' });
    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).not.toMatch(/\bip\b|user_agent/i);
  });
});

describe('linkDelAd', () => {
  it('saca el destino de la base, nunca de la petición', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ link: 'https://ejemplo.invalid/x' }] });
    expect(await linkDelAd(3)).toBe('https://ejemplo.invalid/x');
    expect(queryMock.mock.calls[0][1]).toEqual([3]);
  });

  it('devuelve null si el ad no existe o no tiene link', async () => {
    expect(await linkDelAd(99)).toBeNull();
    queryMock.mockResolvedValueOnce({ rows: [{ link: null }] });
    expect(await linkDelAd(3)).toBeNull();
  });
});
