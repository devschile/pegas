/**
 * Mezcla un entero en otro, repartido.
 *
 * Existe para elegir de forma determinística pero no obvia: un `n % k` directo
 * da resultados consecutivos para entradas consecutivas, que se nota como un
 * patrón. Esto los reparte sin dejar de ser una función pura del argumento, o
 * sea reproducible.
 *
 * La usan la posición del ad en el listado (`utils/ads.ts`) y la rotación de
 * las pegas similares (`server/utils/relacionadas.ts`), a los dos lados de la
 * frontera cliente/servidor.
 */
export function mezclar(n: number): number {
  let x = (n | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}
