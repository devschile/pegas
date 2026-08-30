import pg from 'pg';

let pool: pg.Pool | null = null;

/**
 * process.env.PG* tiene precedencia sobre runtimeConfig.pg: Coolify y el
 * resto del monorepo (n8n, scripts/) ya usan esos nombres planos, y
 * mantener runtimeConfig.pg (override-able via NUXT_PG_*) solo como
 * fallback evita un segundo juego de secrets duplicado.
 */
function resolvePgConfig() {
  const config = useRuntimeConfig();
  return {
    host: process.env.PGHOST || config.pg.host,
    port: parseInt(process.env.PGPORT || config.pg.port, 10),
    database: process.env.PGDATABASE || config.pg.database,
    user: process.env.PGUSER || config.pg.user,
    password: process.env.PGPASSWORD || config.pg.password,
  };
}

/**
 * Pool a nivel de modulo: Nitro con preset node-server es un proceso largo,
 * no serverless, asi que un singleton es correcto. Instanciado perezoso
 * para que importar este archivo en un test no abra sockets.
 */
function getPool(): pg.Pool {
  if (pool) return pool;

  pool = new pg.Pool({
    ...resolvePgConfig(),
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'pegas-web',
  });

  /**
   * Un cliente idle que falla (reinicio de Postgres, redeploy del servicio
   * en Coolify) emite 'error' en el Pool. Sin este handler, un evento
   * 'error' sin listener en un EventEmitter mata el proceso Node entero --
   * la forma mas comun en que una app pg se cae en produccion.
   */
  pool.on('error', err => {
    console.error('[db] error en cliente idle del pool:', err.message);
  });

  return pool;
}

export function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
