export default defineEventHandler(async event => {
  const { user } = await requireUserSession(event);

  const usuario = await getUsuario(user.id);
  if (!usuario) {
    throw createError({ statusCode: 404, message: 'Usuario no encontrado' });
  }

  return { id: usuario.id, nombre: usuario.nombre, avatarUrl: usuario.avatarUrl, rol: usuario.rol };
});
