/**
 * Qué pestaña pide un evento `ch-change`, si es que pide alguna.
 *
 * `ch-change` es un evento compuesto que burbujea, y cada `ch-input`,
 * `ch-select` y `ch-switch` que viva dentro de un panel emite uno. El
 * `@ch-change` del `ch-tabs` los recibe todos. Sin filtrar, escribir una URL
 * en el formulario de ads terminaba en `?tab=https://…`: ninguna pestaña
 * coincidía, se caía a la primera y el panel se desmontaba con el formulario
 * a medio llenar.
 *
 * Se comprueban dos cosas, y las dos hacen falta. El emisor, porque un campo
 * de adentro no está pidiendo cambiar de pestaña aunque su valor coincida por
 * casualidad con el nombre de una. Y el valor, porque el `detail` de un campo
 * puede ser cualquier cosa —un booleano, un objeto— y no tiene por qué
 * terminar en la URL.
 *
 * Al cruzar el borde del shadow DOM el navegador reapunta `target` al host,
 * así que un clic en el botón interno de la pestaña llega con `target` igual
 * al propio `ch-tabs`; uno de un campo del panel, no.
 */
export function pestanaDelEvento(e: Event, valores: readonly string[]): string | null {
  if (e.target !== e.currentTarget) return null;
  const pedida = (e as CustomEvent<unknown>).detail;
  return typeof pedida === 'string' && valores.includes(pedida) ? pedida : null;
}
