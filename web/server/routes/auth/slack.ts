interface SlackOpenIdUser {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export default defineOAuthSlackEventHandler({
  /**
   * clientId explicito -- Nitro resuelve runtimeConfig.oauth.slack.clientId
   * via getEnv()/destr() (@nuxt/kit), que castea CUALQUIER env var con pinta
   * de numero a un JS Number sin mirar el tipo del default. El client_id de
   * Slack (`<workspace>.<app>`, ej. "25219134371.11823773842547") tiene mas
   * digitos que la precision de un double (~15-17), asi que destr() lo
   * redondea a "25219134371.118237" -- el redirect_uri terminaba con un
   * client_id truncado y Slack devolvia 404 en /openid/connect/authorize.
   * process.env es siempre string crudo, evita el bug leyendolo directo.
   */
  config: { clientId: process.env.NUXT_OAUTH_SLACK_CLIENT_ID },
  async onSuccess(event, { user }: { user: SlackOpenIdUser }) {
    /**
     * findOrCreateUser vincula cuentas por email cuando el proveedor no
     * matchea (ver server/utils/usuarios.ts) -- con un email sin verificar
     * cualquiera podria reclamar el email de otra persona y heredar sus
     * pegas guardadas, asi que un email no verificado se trata como si no
     * hubiera venido ninguno (crea/usa una cuenta propia por (slack, sub)).
     */
    const usuario = await findOrCreateUser({
      proveedor: 'slack',
      proveedorId: user.sub,
      email: user.email_verified === false ? null : (user.email ?? null),
      nombre: user.name ?? null,
      avatarUrl: user.picture ?? null,
    });
    await setUserSession(event, { user: { id: usuario.id } });
    return sendRedirect(event, '/mis-pegas');
  },
  onError(event, error) {
    console.error('[auth] Slack OAuth error:', error.message);
    return sendRedirect(event, '/');
  },
});
