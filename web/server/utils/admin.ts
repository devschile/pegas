import { createError } from 'h3';
import type { H3Event } from 'h3';

/**
 * `requireUserSession` es un auto-import de nuxt-auth-utils -- no se puede
 * importar explícito fuera de un server real (mismo motivo que
 * `defineOAuthSlackEventHandler` en server/routes/auth/*.ts), así que esta
 * función tampoco es testeable con un evento H3 fabricado a mano. Se deja
 * sin test, igual que el resto de wrappers finos de sesión en este repo.
 */
export async function requireAdmin(event: H3Event): Promise<{ userId: number }> {
  const { user } = await requireUserSession(event);
  const rol = await getUserRole(user.id);
  if (rol !== 'admin') {
    throw createError({ statusCode: 403, message: 'Requiere rol admin' });
  }
  return { userId: user.id };
}
