/**
 * Estado abierto/cerrado del menú flotante de cuenta (UserMenu.vue), como
 * useState compartido y no un ref local: PegaCard muestra un "Inicia
 * sesión" cuando no hay sesión, y necesita abrir ese mismo menú sin ser su
 * ancestro en el árbol de componentes.
 */
export function useUserMenu() {
  const open = useState('user-menu-open', () => false);
  return { open };
}
