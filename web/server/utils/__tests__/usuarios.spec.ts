// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findOrCreateUser, getUserRole, getUsuario } from '../usuarios';

const queryMock = vi.fn();
const clientQueryMock = vi.fn();

vi.mock('../db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (fn: (client: { query: typeof clientQueryMock }) => unknown) => fn({ query: clientQueryMock }),
}));

const input = {
  proveedor: 'github' as const,
  proveedorId: '123',
  email: 'dev@example.com',
  nombre: 'Dev Ejemplo',
  avatarUrl: 'https://example.com/avatar.png',
};

describe('findOrCreateUser', () => {
  beforeEach(() => {
    clientQueryMock.mockReset();
  });

  it('crea un usuario nuevo como candidato si no existe', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [] });
    clientQueryMock.mockResolvedValueOnce({
      rows: [{ id: 1, rol: 'candidato', nombre: 'Dev Ejemplo', avatar_url: 'https://example.com/avatar.png' }],
    });

    const usuario = await findOrCreateUser(input);

    expect(usuario).toEqual({ id: 1, rol: 'candidato', nombre: 'Dev Ejemplo', avatarUrl: 'https://example.com/avatar.png' });
    const [insertSql, insertValues] = clientQueryMock.mock.calls[1]!;
    expect(insertSql).toContain('INSERT INTO usuarios');
    expect(insertValues).toEqual(['github', '123', 'dev@example.com', 'Dev Ejemplo', 'https://example.com/avatar.png']);
  });

  it('actualiza y devuelve el usuario existente por (proveedor, proveedor_id)', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [{ id: 7, rol: 'empresa', nombre: 'Viejo', avatar_url: null }] });
    clientQueryMock.mockResolvedValueOnce({
      rows: [{ id: 7, rol: 'empresa', nombre: 'Dev Ejemplo', avatar_url: 'https://example.com/avatar.png' }],
    });

    const usuario = await findOrCreateUser(input);

    expect(usuario).toEqual({ id: 7, rol: 'empresa', nombre: 'Dev Ejemplo', avatarUrl: 'https://example.com/avatar.png' });
    const [selectSql, selectValues] = clientQueryMock.mock.calls[0]!;
    expect(selectSql).toContain('WHERE proveedor = $1 AND proveedor_id = $2');
    expect(selectValues).toEqual(['github', '123']);
    const [updateSql, updateValues] = clientQueryMock.mock.calls[1]!;
    expect(updateSql).toContain('UPDATE usuarios');
    expect(updateValues).toEqual(['dev@example.com', 'Dev Ejemplo', 'https://example.com/avatar.png', 7]);
  });

  it('no crea una fila nueva ni pisa el rol de un usuario existente', async () => {
    clientQueryMock.mockResolvedValueOnce({ rows: [{ id: 7, rol: 'admin', nombre: 'X', avatar_url: null }] });
    clientQueryMock.mockResolvedValueOnce({ rows: [{ id: 7, rol: 'admin', nombre: 'X', avatar_url: null }] });

    const usuario = await findOrCreateUser(input);

    expect(usuario.rol).toBe('admin');
    expect(clientQueryMock).toHaveBeenCalledTimes(2);
  });
});

describe('getUserRole', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve el rol si el usuario existe', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ rol: 'empresa' }] });

    expect(await getUserRole(7)).toBe('empresa');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('WHERE id = $1'), [7]);
  });

  it('devuelve null si no existe', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    expect(await getUserRole(999)).toBeNull();
  });
});

describe('getUsuario', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('devuelve el perfil completo si existe', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [{ id: 7, rol: 'candidato', nombre: 'Dev Ejemplo', avatar_url: 'https://example.com/a.png' }],
    });

    expect(await getUsuario(7)).toEqual({ id: 7, rol: 'candidato', nombre: 'Dev Ejemplo', avatarUrl: 'https://example.com/a.png' });
  });

  it('devuelve null si no existe', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });

    expect(await getUsuario(999)).toBeNull();
  });
});
