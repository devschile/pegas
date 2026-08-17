/**
 * Sesion minima a proposito: solo el id de usuarios. El rol nunca vive acá
 * -- ver server/utils/usuarios.ts (getUserRole) para el porqué.
 */
declare module '#auth-utils' {
  interface User {
    id: number;
  }
}

export {};
