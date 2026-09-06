/**
 * Geometría y color del campo de brackets. Vive fuera del componente porque
 * el componente pinta en canvas: sin DOM que inspeccionar, la única forma de
 * testear esto es que sean funciones puras.
 *
 * La técnica viene de la pieza de referencia que guardamos en `design/`: una
 * grilla de caracteres monoespaciados donde un barrido angular decide el
 * carácter, el color y la intensidad de cada celda.
 */

export const ABIERTOS = ['‹', '{', '[', '('];
export const CERRADOS = ['›', '}', ']', ')'];

/** El desnivel entre filas evita que el campo se lea como una tabla. */
export const DESNIVEL = [0, -2, 2, -2, 0];
export const BASE = 26;

/** Celda en em, la misma grilla que usa el wordmark. */
export const CELDA_EM = 22 / 34;
export const FILA_EM = 40 / 34;

const VELOCIDAD = 0.00055; // rad/ms
const PASO_GLIFO = 170; // ms entre cambios de caracter

/**
 * Cinco tonos y no un degradado de uno solo: con la rampa monocroma el campo
 * se leía como una mancha y el conjunto quedaba duotono. El barrido angular
 * los reparte, así que se ven todos girando. Son los mismos nombres que
 * declaraba el CSS; el componente los lee de las custom properties para que
 * la página pueda seguir cambiándolos.
 */
export const BANDAS = ['--banda-0', '--banda-1', '--banda-2', '--banda-3', '--banda-4'] as const;

/** Holgura del calado. Corta a propósito: el agujero abraza el texto. */
export const HOLGURA = 6;

export type Alineacion = 'inicio' | 'centro' | 'fin';

export interface Grilla {
  /** Cuántas columnas tiene cada fila. */
  filas: number[];
  /** La fila más ancha, que es la que fija el ancho del lienzo. */
  cols: number;
  ancho: number;
  alto: number;
  celda: { ancho: number; alto: number };
}

export const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * Con `ancho`/`alto` en cero la grilla es la fija de cinco filas, que es el
 * remate lateral. Con medidas, el campo llena su contenedor: es el fondo de
 * una banda entera y con cinco filas quedaba una franja delgada al medio.
 */
export function construirGrilla(fs: number, ancho = 0, alto = 0): Grilla {
  const ca = fs * CELDA_EM;
  const cl = fs * FILA_EM;
  const base = ancho > 0 ? Math.max(BASE, Math.ceil(ancho / ca)) : BASE;
  const desnivel =
    alto > 0
      ? Array.from(
          { length: Math.max(DESNIVEL.length, Math.ceil(alto / cl)) },
          (_, i) => DESNIVEL[i % DESNIVEL.length]!,
        )
      : DESNIVEL;
  const filas = desnivel.map(d => base + d);
  const cols = Math.max(...filas);
  return { filas, cols, ancho: cols * ca, alto: filas.length * cl, celda: { ancho: ca, alto: cl } };
}

/** Las filas no miden lo mismo, así que cada una se corre según el lado. */
export function desplazamiento(cols: number, colsMax: number, anchoCelda: number, a: Alineacion) {
  const sobra = (colsMax - cols) * anchoCelda;
  return a === 'inicio' ? 0 : a === 'fin' ? sobra : sobra / 2;
}

export interface Caja {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Una celda se cala si su centro cae dentro de alguna de las cajas. Se
 * comparan cajas y no elementos: en canvas no hay un nodo por celda al que
 * preguntarle su posición, que es justamente lo que hacía cara la versión
 * anterior —un `getBoundingClientRect` por celda, cada uno forzando layout.
 */
export function estaCalada(cx: number, cy: number, cajas: Caja[], holgura = HOLGURA): boolean {
  return cajas.some(
    b =>
      cx > b.left - holgura &&
      cx < b.right + holgura &&
      cy > b.top - holgura &&
      cy < b.bottom + holgura,
  );
}

export interface Pinta {
  ch: string;
  banda: number;
  peso: number;
}

export function celda(
  x: number,
  y: number,
  cols: number,
  filas: number,
  t: number,
  espejo: boolean,
): Pinta {
  const cx = (cols - 1) / 2;
  const cy = (filas - 1) / 2;
  const nx = x - cx;
  const angulo = Math.atan2(y - cy, nx);
  const barrido = mod(t * VELOCIDAD, Math.PI * 2);

  const paso = Math.floor(t / PASO_GLIFO + y * 1.7 + Math.abs(nx) * 0.8);
  const izquierda = espejo ? x > cx : x <= cx;
  const glifos = izquierda ? ABIERTOS : CERRADOS;

  const tono = mod(angulo - barrido, Math.PI * 2) / (Math.PI * 2);
  const distancia = Math.min(mod(angulo - barrido, Math.PI * 2), mod(barrido - angulo, Math.PI * 2));

  return {
    ch: glifos[mod(paso, glifos.length)]!,
    banda: Math.min(BANDAS.length - 1, Math.floor(tono * 5)),
    // El haz va nítido y el resto se apaga: es lo que da la sensación de radar.
    peso: distancia < 0.16 ? 1 : distancia < 0.42 ? 0.85 : distancia < 0.78 ? 0.55 : 0.28,
  };
}
