export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user }) {
    const usuario = await findOrCreateUser({
      proveedor: 'github',
      proveedorId: String(user.id),
      email: user.email,
      nombre: user.name || user.login,
      avatarUrl: user.avatar_url,
    });
    await setUserSession(event, { user: { id: usuario.id } });
    return sendRedirect(event, '/mis-pegas');
  },
  onError(event, error) {
    console.error('[auth] GitHub OAuth error:', error.message);
    return sendRedirect(event, '/');
  },
});
