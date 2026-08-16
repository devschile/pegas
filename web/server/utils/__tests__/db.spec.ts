// @vitest-environment node
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { poolMock, PoolConstructorMock } = vi.hoisted(() => {
  const poolMock = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn(),
    on: vi.fn(),
  };
  return {
    poolMock,
    PoolConstructorMock: vi.fn(function PoolMock() {
      return poolMock;
    }),
  };
});

vi.mock('pg', () => ({
  default: { Pool: PoolConstructorMock },
}));

mockNuxtImport('useRuntimeConfig', () => () => ({
  pg: { host: 'fallback-host', port: '5432', database: 'pega', user: 'pega', password: '' },
}));

describe('server/utils/db', () => {
  beforeEach(() => {
    vi.resetModules();
    PoolConstructorMock.mockClear();
    poolMock.query.mockClear();
    poolMock.on.mockClear();
  });

  afterEach(() => {
    delete process.env.PGHOST;
  });

  it('usa PGHOST del entorno por sobre runtimeConfig.pg.host', async () => {
    process.env.PGHOST = 'env-host';
    const { query } = await import('../db');

    await query('SELECT 1');

    expect(PoolConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'env-host', max: 5, application_name: 'pegas-web' }),
    );
  });

  it('cae a runtimeConfig.pg.host si no hay PGHOST en el entorno', async () => {
    const { query } = await import('../db');

    await query('SELECT 1');

    expect(PoolConstructorMock).toHaveBeenCalledWith(expect.objectContaining({ host: 'fallback-host' }));
  });

  it('registra un handler de error en el pool para no matar el proceso ante un fallo de conexion idle', async () => {
    const { query } = await import('../db');

    await query('SELECT 1');

    expect(poolMock.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('reutiliza el mismo pool entre llamadas (singleton perezoso)', async () => {
    const { query } = await import('../db');

    await query('SELECT 1');
    await query('SELECT 2');

    expect(PoolConstructorMock).toHaveBeenCalledTimes(1);
  });

  it('withTransaction hace COMMIT si la funcion resuelve', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    poolMock.connect.mockResolvedValue(client);
    const { withTransaction } = await import('../db');

    const result = await withTransaction(async c => {
      await c.query('INSERT');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('withTransaction hace ROLLBACK y relanza si la funcion falla', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    poolMock.connect.mockResolvedValue(client);
    const { withTransaction } = await import('../db');

    await expect(withTransaction(async () => {
      throw new Error('fallo');
    })).rejects.toThrow('fallo');

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
