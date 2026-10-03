/**
 * Puntaje de similitud de texto, sin depender de una extensión de Postgres.
 *
 * `dev/schema.dev.sql` no trae `pg_trgm` (ver README, "De dónde salen las
 * pegas") y ese archivo no se edita a mano -- pedir la extensión implicaría
 * abrir un issue en pegas-core y esperar una migración solo para un aviso de
 * "esto ya podría existir" en el panel de admin. Un cálculo aproximado acá,
 * con trigramas de caracteres (la misma idea detrás de `similarity()` de
 * pg_trgm), alcanza para avisar sin esperar nada.
 */

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function trigramas(texto: string): Set<string> {
  const limpio = normalizar(texto);
  if (limpio.length < 3) return new Set(limpio ? [limpio] : []);
  const set = new Set<string>();
  for (let i = 0; i <= limpio.length - 3; i++) set.add(limpio.slice(i, i + 3));
  return set;
}

/**
 * Coeficiente de Dice entre 0 y 1 sobre trigramas de caracteres: 1 es
 * idéntico (una vez normalizado), 0 no comparten ningún trigrama.
 */
export function similitud(a: string, b: string): number {
  const ta = trigramas(a);
  const tb = trigramas(b);
  if (ta.size === 0 || tb.size === 0) return 0;

  let interseccion = 0;
  for (const t of ta) if (tb.has(t)) interseccion++;
  return (2 * interseccion) / (ta.size + tb.size);
}

/**
 * Bajo esto no se avisa. Es un umbral conservador a propósito: un falso
 * positivo le hace desconfiar a quien carga avisos de una herramienta que
 * recién está probando, y dos títulos de pegas DISTINTAS en la misma
 * categoría ya comparten bastante vocabulario ("desarrollador", "senior",
 * "remoto"). Mejor perder alguna parecida real que acostumbrar a ignorar el
 * aviso.
 */
export const UMBRAL_DUPLICADO = 0.55;

export interface CandidataParaRankear {
  titulo: string;
  empleador: string | null;
}

/**
 * Título y empleador se puntúan por separado y se multiplican, no se
 * concatenan en una sola cadena. Concatenar hacía que un título idéntico
 * arrastrara el puntaje aunque el empleador fuera otro: "Desarrollador" en
 * dos empleadores comparte casi todos los trigramas igual, porque la mayor
 * parte de la cadena combinada es el título. Multiplicar castiga fuerte un
 * empleador distinto (da 1 × algo bajo) sin necesitar un umbral separado
 * para cada campo.
 *
 * Si falta el empleador de alguno de los dos lados (típico mientras se
 * recién empieza a escribir en el formulario) no se castiga: se usa el
 * título solo, para no perder avisos útiles por un campo que todavía no se
 * llenó.
 */
export function puntajeDuplicado(a: CandidataParaRankear, b: CandidataParaRankear): number {
  const tituloScore = similitud(a.titulo, b.titulo);

  const empleadorA = a.empleador?.trim();
  const empleadorB = b.empleador?.trim();
  if (!empleadorA || !empleadorB) return tituloScore;

  return tituloScore * similitud(empleadorA, empleadorB);
}
