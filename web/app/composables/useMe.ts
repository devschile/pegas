import { computed } from 'vue';
import type { Rol } from '../../server/utils/usuarios';

export interface Me {
  id: number;
  nombre: string | null;
  avatarUrl: string | null;
  rol: Rol;
}

/**
 * `key: 'me'` -- compartido con cualquier otro caller (mismo patron que
 * usePegaReactions/'pega-states'): Nuxt dedupea useFetch por key, asi que
 * UserMenu y PegaCard leen el mismo fetch/cache en vez de duplicar la
 * llamada a /api/me por cada card admin en la pagina.
 */
export function useMe() {
  const { loggedIn } = useUserSession();
  const { data: me, refresh } = useFetch<Me>('/api/me', { key: 'me', immediate: loggedIn.value });
  const isAdmin = computed(() => me.value?.rol === 'admin');

  return { me, isAdmin, refresh };
}
