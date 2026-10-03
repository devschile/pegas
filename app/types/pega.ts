export interface Pega {
  id: number;
  url: string;
  titulo: string;
  empleador: string;
  descripcion: string;
  categoria: string;
  ubicacion: string;
  sueldo: string | null;
  tags: string | null;
  fecha_publicacion: string | null;
  fuente: string;
  fecha_creacion: string;
  /** Conteos públicos de reacciones -- ver server/utils/contadores.ts. */
  likes: number;
  dislikes: number;
  guardados: number;
}

export interface PegasListado {
  total: number;
  pagina: number;
  porPagina: number;
  pegas: Pega[];
}

export interface PegasMeta {
  total: number;
  categorias: string[];
  fuentes: string[];
  actualizado: string | null;
}

/**
 * Una pega recomendada al pie de otra, tal como la devuelve
 * `/api/pegas/:id/relacionadas`.
 *
 * No es una `Pega` recortada por casualidad: la tarjeta del bloque no muestra
 * descripción ni reacciones, así que pedirlas sería cargar el payload de una
 * página de detalle con datos que nadie va a leer. `score` y `motivo` no
 * vienen de la pega sino de la arista que la trajo -- los calcula pegas-core,
 * acá solo se leen (ver server/utils/relacionadas.ts).
 */
export interface PegaRelacionada {
  id: number;
  titulo: string;
  empleador: string;
  categoria: string;
  ubicacion: string;
  sueldo: string | null;
  tags: string | null;
  fecha_publicacion: string | null;
  fecha_creacion: string;
  score: number;
  motivo: string;
}

/**
 * Candidata a duplicado al cargar una pega a mano desde el panel de admin,
 * tal como la devuelve `/api/pegas/similares` -- ver
 * `server/utils/pegas-similitud.ts`. `score` es una aproximación hecha en
 * Node, no el `score` normalizado 0..1 de `pegas_similares`/`PegaRelacionada`,
 * que calcula pegas-core; no se deben mezclar ni comparar entre sí.
 */
export interface PegaCandidataSimilar {
  id: number;
  url: string;
  titulo: string;
  empleador: string | null;
  categoria: string | null;
  ubicacion: string | null;
  fuente: string;
  fecha_creacion: string;
  score: number;
}

export interface PegaSimilaresResultado {
  /**
   * Misma `url`: ya existe seguro, el alta la va a rechazar igual (`url` es
   * UNIQUE). Sin `score` -- no es una aproximación, es la misma fila.
   */
  exacta: Omit<PegaCandidataSimilar, 'score'> | null;
  /** Parecidas por título/empleador, sobre el umbral -- un aviso, no un bloqueo. */
  similares: PegaCandidataSimilar[];
}
