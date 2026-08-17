/**
 * Bypass de login solo para desarrollo local -- sin credenciales OAuth
 * reales todavia no hay forma de probar el flujo completo. `import.meta.dev`
 * es `false` en un build de produccion, asi que este handler nunca queda
 * accesible fuera de `pnpm dev`.
 */
export default defineEventHandler(async event => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 });
  }

  const usuario = await findOrCreateUser({
    proveedor: 'github',
    proveedorId: 'dev-mock',
    email: 'dev@example.com',
    nombre: 'Dev Local',
    avatarUrl: null,
  });
  await setUserSession(event, { user: { id: usuario.id } });
  return sendRedirect(event, '/');
});
