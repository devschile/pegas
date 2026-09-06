/**
 * El id llega del path, o sea es entrada de usuario. Se valida acá y no se
 * confía en que Postgres rechace un texto: un id inválido tiene que dar 400 y
 * no un error de tipo desde la base.
 */
export function parseAdId(raw: string | undefined): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
