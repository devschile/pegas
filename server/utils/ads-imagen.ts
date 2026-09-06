/**
 * Validación de las imágenes que sube el panel.
 *
 * El tipo se detecta por los **bytes del archivo**, no por el `Content-Type`
 * ni por la extensión: los dos los elige quien sube, así que no prueban nada.
 * Un endpoint de subida es de lo más atacado que hay, y el chequeo barato de
 * confiar en la cabecera es exactamente el que no sirve.
 */

export const MAX_BYTES = 2 * 1024 * 1024;

export type TipoImagen = 'png' | 'jpeg' | 'gif' | 'webp';

const EXTENSION: Record<TipoImagen, string> = {
  png: 'png',
  jpeg: 'jpg',
  gif: 'gif',
  webp: 'webp',
};

const empiezaCon = (b: Uint8Array, firma: number[], desde = 0) =>
  firma.every((byte, i) => b[desde + i] === byte);

/**
 * Devuelve el tipo real o `null`.
 *
 * **SVG queda fuera a propósito**, aunque sea una imagen: es un documento XML
 * que puede traer `<script>`. Los SVG de `dev/` no pasan por acá — los sirve
 * el propio sitio desde `public/` y son nuestros.
 */
export function detectarTipo(bytes: Uint8Array): TipoImagen | null {
  if (bytes.length < 12) return null;
  if (empiezaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (empiezaCon(bytes, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (empiezaCon(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif';
  // WebP es un contenedor RIFF: "RIFF" al inicio y "WEBP" en el byte 8.
  if (empiezaCon(bytes, [0x52, 0x49, 0x46, 0x46]) && empiezaCon(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  return null;
}

export type ResultadoImagen =
  | { ok: true; tipo: TipoImagen; nombre: string; mime: string }
  | { ok: false; error: string };

/**
 * El nombre del archivo lo generamos nosotros. El que manda el cliente puede
 * traer rutas, caracteres de control o una extensión que no corresponde al
 * contenido; nada de eso aporta y todo puede molestar más adelante.
 */
export function nombreSeguro(tipo: TipoImagen, aleatorio = () => Math.random().toString(36).slice(2, 10)): string {
  return `ad-${Date.now()}-${aleatorio()}.${EXTENSION[tipo]}`;
}

export function validarImagen(bytes: Uint8Array | null | undefined): ResultadoImagen {
  if (!bytes || bytes.length === 0) return { ok: false, error: 'no llegó ningún archivo' };

  if (bytes.length > MAX_BYTES) {
    return { ok: false, error: `la imagen pesa más de ${Math.round(MAX_BYTES / 1024 / 1024)} MB` };
  }

  const tipo = detectarTipo(bytes);
  if (!tipo) {
    return {
      ok: false,
      error: 'el archivo no es una imagen PNG, JPEG, GIF o WebP (el SVG no se acepta: puede traer scripts)',
    };
  }

  return { ok: true, tipo, nombre: nombreSeguro(tipo), mime: `image/${tipo}` };
}
