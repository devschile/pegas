// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actualizarAd, actualizarEmpresa, borrarAd, crearAd, crearEmpresa, listarAdsAdmin, listarEmpresas, listarLog } from '../ads-db';
import type { AdEntrada } from '../ads-validacion';

const queryMock = vi.fn();
const clientQuery = vi.fn();

vi.mock('../db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (fn: (c: unknown) => unknown) => fn({ query: (...a: unknown[]) => clientQuery(...a) }),
}));

const entrada: AdEntrada = {
  empresa_id: 2,
  nombre: 'Campaña',
  formato: 'imagen',
  imagen_desktop_url: 'https://x.cl/d.png',
  imagen_movil_url: 'https://x.cl/m.png',
  alt: 'x',
  html: null,
  alto_desktop: null,
  alto_movil: null,
  link: 'https://x.cl',
  activo: true,
  ubicaciones: ['header'],
  inicia_en: null,
  termina_en: null,
};

/** Devuelve el SQL de cada llamada al cliente, en orden. */
const sqls = () => clientQuery.mock.calls.map(c => String(c[0]).replace(/\s+/g, ' ').trim());

beforeEach(() => {
  queryMock.mockReset();
  clientQuery.mockReset();
});

describe('crearAd', () => {
  it('inserta y registra el log en la misma transacción', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ id: 10, nombre: 'Campaña', formato: 'imagen', ubicaciones: ['header'], activo: true }] })
      .mockResolvedValueOnce({ rows: [] });

    const ad = await crearAd(entrada, 5);

    expect(ad.id).toBe(10);
    expect(sqls()[0]).toMatch(/^INSERT INTO ads/);
    expect(sqls()[1]).toMatch(/^INSERT INTO ads_log/);
    const log = clientQuery.mock.calls[1][1] as unknown[];
    expect(log[0]).toBe(10);
    expect(log[3]).toBe('crear');
  });
});

describe('actualizarAd', () => {
  it('devuelve null si el ad no existe, sin escribir nada', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [] });
    expect(await actualizarAd(99, entrada, 5)).toBeNull();
    expect(sqls().some(s => s.startsWith('UPDATE ads'))).toBe(false);
  });

  it('bloquea la fila antes de leerla, para no correr contra otra edición', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ nombre: 'Antes', activo: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Campaña', activo: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await actualizarAd(1, entrada, 5);
    expect(sqls()[0]).toMatch(/FOR UPDATE/);
  });

  it('registra "editar" cuando el estado no cambió', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ nombre: 'Antes', activo: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Campaña', activo: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await actualizarAd(1, entrada, 5);
    expect((clientQuery.mock.calls[2][1] as unknown[])[3]).toBe('editar');
  });

  it('distingue encendido de apagado', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ nombre: 'Antes', activo: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Campaña', activo: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await actualizarAd(1, entrada, 5);
    expect((clientQuery.mock.calls[2][1] as unknown[])[3]).toBe('activar');

    clientQuery.mockReset();
    clientQuery
      .mockResolvedValueOnce({ rows: [{ nombre: 'Antes', activo: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nombre: 'Campaña', activo: false }] })
      .mockResolvedValueOnce({ rows: [] });
    await actualizarAd(1, { ...entrada, activo: false }, 5);
    expect((clientQuery.mock.calls[2][1] as unknown[])[3]).toBe('desactivar');
  });
});

describe('borrarAd', () => {
  it('escribe el log ANTES del delete, o quedaría huérfano', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ id: 7, empresa_id: 2, nombre: 'Vieja' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    expect(await borrarAd(7, 5)).toBe(true);
    const orden = sqls();
    const iLog = orden.findIndex(s => s.startsWith('INSERT INTO ads_log'));
    const iDel = orden.findIndex(s => s.startsWith('DELETE FROM ads'));
    expect(iLog).toBeGreaterThan(-1);
    expect(iDel).toBeGreaterThan(iLog);
  });

  it('guarda una foto de la fila completa en el detalle', async () => {
    const fila = { id: 7, empresa_id: 2, nombre: 'Vieja', formato: 'imagen' };
    clientQuery
      .mockResolvedValueOnce({ rows: [fila] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await borrarAd(7, 5);
    const detalle = JSON.parse(String((clientQuery.mock.calls[1][1] as unknown[])[4]));
    expect(detalle).toMatchObject(fila);
  });

  it('devuelve false y no borra nada si no existe', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [] });
    expect(await borrarAd(99, 5)).toBe(false);
    expect(sqls().some(s => s.startsWith('DELETE'))).toBe(false);
  });
});

describe('listarAdsAdmin', () => {
  it('trae también los apagados y el estado de la empresa', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await listarAdsAdmin();
    const sql = String(queryMock.mock.calls[0][0]);
    expect(sql).not.toMatch(/WHERE a\.activo/);
    expect(sql).toMatch(/e\.activo AS empresa_activa/);
  });
});

describe('listarLog', () => {
  it('acota el límite para que nadie pida la tabla entera', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await listarLog(99999);
    expect(queryMock.mock.calls[0][1]).toEqual([500]);
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
    await listarLog(-5);
    expect(queryMock.mock.calls[0][1]).toEqual([1]);
  });
});

const empresa = {
  nombre: 'Panguipulli Labs',
  slug: 'panguipulli-labs',
  sitio_url: null,
  contacto_email: null,
  activo: true,
  es_casa: false,
};

describe('crearEmpresa', () => {
  it('inserta y deja registro, sin ad_id', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ id: 4, nombre: 'Panguipulli Labs', slug: 'panguipulli-labs', es_casa: false }] })
      .mockResolvedValueOnce({ rows: [] });

    const e = await crearEmpresa(empresa, 5);

    expect(e.id).toBe(4);
    expect(sqls()[0]).toMatch(/^INSERT INTO empresas/);
    const log = clientQuery.mock.calls[1][1] as unknown[];
    expect(log[0]).toBeNull();
    expect(log[1]).toBe(4);
    expect(log[3]).toBe('crear_empresa');
  });
});

describe('actualizarEmpresa', () => {
  it('devuelve null si no existe', async () => {
    clientQuery.mockResolvedValueOnce({ rows: [] });
    expect(await actualizarEmpresa(99, empresa, 5)).toBeNull();
    expect(sqls().some(s => s.startsWith('UPDATE empresas'))).toBe(false);
  });

  it('registra editar_empresa cuando el estado no cambió', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ nombre: 'Antes', activo: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 4, nombre: 'Panguipulli Labs', activo: true }] })
      .mockResolvedValueOnce({ rows: [] });
    await actualizarEmpresa(4, empresa, 5);
    expect((clientQuery.mock.calls[2][1] as unknown[])[3]).toBe('editar_empresa');
  });

  it('apagar la empresa queda registrado como tal: baja todos sus ads de una vez', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [{ nombre: 'Antes', activo: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 4, nombre: 'Panguipulli Labs', activo: false }] })
      .mockResolvedValueOnce({ rows: [] });
    await actualizarEmpresa(4, { ...empresa, activo: false }, 5);
    expect((clientQuery.mock.calls[2][1] as unknown[])[3]).toBe('desactivar_empresa');
  });
});

describe('listarEmpresas', () => {
  it('cuenta los ads de cada una y pone las de casa primero', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await listarEmpresas();
    const sql = String(queryMock.mock.calls[0][0]).replace(/\s+/g, ' ');
    expect(sql).toMatch(/COUNT\(a\.id\) FILTER \(WHERE a\.activo\)/);
    expect(sql).toMatch(/ORDER BY e\.es_casa DESC/);
  });
});
