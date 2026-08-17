interface SlackOpenIdUser {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export default defineOAuthSlackEventHandler({
  async onSuccess(event, { user }: { user: SlackOpenIdUser }) {
    const usuario = await findOrCreateUser({
      proveedor: 'slack',
      proveedorId: user.sub,
      email: user.email ?? null,
      nombre: user.name ?? null,
      avatarUrl: user.picture ?? null,
    });
    await setUserSession(event, { user: { id: usuario.id } });
    return sendRedirect(event, '/');
  },
  onError(event, error) {
    console.error('[auth] Slack OAuth error:', error.message);
    return sendRedirect(event, '/');
  },
});
