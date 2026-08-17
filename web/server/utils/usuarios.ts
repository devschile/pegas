import { query, withTransaction } from './db';

export type Rol = 'candidato' | 'empresa' | 'admin';

export interface Usuario {
  id: number;
  rol: Rol;
  nombre: string | null;
  avatarUrl: string | null;
}

export interface FindOrCreateUserInput {
  proveedor: 'github' | 'slack';
  proveedorId: string;
  email: string | null;
  nombre: string | null;
  avatarUrl: string | null;
}

interface UsuarioRow {
  id: number;
  rol: Rol;
  nombre: string | null;
  avatar_url: string | null;
}

function mapRow(row: UsuarioRow): Usuario {
  return { id: row.id, rol: row.rol, nombre: row.nombre, avatarUrl: row.avatar_url };
}

/**
 * Todo en una transaccion: el SELECT + INSERT/UPDATE tienen que ser
 * atomicos para no crear dos filas si el mismo usuario completa el OAuth
 * dos veces en paralelo (doble click, dos pestañas).
 */
export async function findOrCreateUser(input: FindOrCreateUserInput): Promise<Usuario> {
  return withTransaction(async client => {
    const { rows: existing } = await client.query<UsuarioRow>(
      'SELECT id, rol, nombre, avatar_url FROM usuarios WHERE proveedor = $1 AND proveedor_id = $2',
      [input.proveedor, input.proveedorId],
    );

    if (existing[0]) {
      const { rows: updated } = await client.query<UsuarioRow>(
        `UPDATE usuarios
         SET fecha_ultimo_login = NOW(), email = $1, nombre = $2, avatar_url = $3
         WHERE id = $4
         RETURNING id, rol, nombre, avatar_url`,
        [input.email, input.nombre, input.avatarUrl, existing[0].id],
      );
      return mapRow(updated[0]!);
    }

    const { rows: inserted } = await client.query<UsuarioRow>(
      `INSERT INTO usuarios (proveedor, proveedor_id, email, nombre, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, rol, nombre, avatar_url`,
      [input.proveedor, input.proveedorId, input.email, input.nombre, input.avatarUrl],
    );
    return mapRow(inserted[0]!);
  });
}

/**
 * Aparte de `findOrCreateUser` a proposito: el rol nunca se guarda en la
 * sesion sellada (ver server/routes/auth/*.ts), asi que cualquier chequeo
 * de permisos vuelve a consultar la base en cada request -- si un admin
 * cambia el rol de alguien, el efecto es inmediato, no depende de que esa
 * persona cierre sesion.
 */
export async function getUserRole(id: number): Promise<Rol | null> {
  const { rows } = await query<{ rol: Rol }>('SELECT rol FROM usuarios WHERE id = $1', [id]);
  return rows[0]?.rol ?? null;
}

export async function getUsuario(id: number): Promise<Usuario | null> {
  const { rows } = await query<UsuarioRow>('SELECT id, rol, nombre, avatar_url FROM usuarios WHERE id = $1', [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}
