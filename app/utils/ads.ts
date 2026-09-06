/**
 * Dónde cae el ad entremedio de las cards del listado.
 *
 * La posición es **determinística por página**, no aleatoria por render. Si
 * cambiara en cada recarga, el ad saltaría de lugar (layout shift) y el CTR
 * dejaría de ser atribuible a una posición: no se podría comparar si rinde
 * mejor arriba o abajo, que es justo lo que queremos poder medir después.
 *
 * Entre páginas sí cambia, para no quemar siempre el mismo hueco.
 */

/**
 * Mezcla el número de página en un entero. Un `pagina % n` directo daría
 * posiciones consecutivas para páginas consecutivas, que se nota como un
 * patrón; esto las reparte.
 */
function mezclar(n: number): number {
  let x = (n | 0) + 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return (x ^ (x >>> 15)) >>> 0;
}

/**
 * Devuelve el índice de card ANTES del cual insertar el ad, o `null` si la
 * página tiene tan pocas pegas que el ad estorbaría más de lo que aporta.
 *
 * Nunca primero ni último: arriba compite con el primer resultado, que es lo
 * que la persona vino a ver, y abajo se confunde con el ad del pie.
 */
export function posicionEnListado(pagina: number, cantidadCards: number): number | null {
  if (!Number.isFinite(pagina) || !Number.isFinite(cantidadCards)) return null;
  if (cantidadCards < 4) return null;

  const minimo = 1;
  const maximo = cantidadCards - 1;
  return minimo + (mezclar(Math.trunc(pagina)) % (maximo - minimo + 1));
}
