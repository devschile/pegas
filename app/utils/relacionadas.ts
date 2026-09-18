/**
 * Copy de la etiqueta que explica por qué una pega entró al bloque.
 *
 * El motivo lo decide pegas-core y es un conjunto abierto; acá solo se
 * traduce a algo legible. Uno desconocido devuelve `null` y la tarjeta se
 * muestra sin etiqueta: core tiene que poder estrenar un motivo nuevo sin que
 * el sitio quede mostrando un identificador crudo —"cohorte_v2"— en la cara
 * de la gente, y sin que haya que desplegar el front antes que el cálculo.
 *
 * Decir el porqué no es adorno: es la diferencia entre una sugerencia y un
 * bloque de relleno, y es lo único que le permite a alguien decidir si vale
 * la pena mirarla sin abrirla.
 */
/**
 * Un `Map` y no un objeto literal: `motivo` sale de la base, o sea que la
 * clave de esta búsqueda es un dato y no una constante del código. Con un
 * objeto, un motivo llamado "constructor" o "toString" devolvería lo que
 * hereda de `Object.prototype` en vez de `null`.
 */
const LABEL_BY_REASON = new Map<string, string>([
  ['stack', 'Mismo stack'],
  ['empresa', 'Misma empresa'],
  ['categoria', 'Misma categoría'],
  ['sueldo', 'Sueldo parecido'],
  ['ubicacion', 'Misma ubicación'],
  ['remoto', 'También remota'],
  ['antiguedad', 'Mismo nivel'],
  ['comportamiento', 'También la miraron'],
]);

export function reasonLabel(motivo: string): string | null {
  return LABEL_BY_REASON.get(motivo) ?? null;
}
