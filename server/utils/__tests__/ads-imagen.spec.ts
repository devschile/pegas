// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { detectarTipo, MAX_BYTES, nombreSeguro, validarImagen } from '../ads-imagen';

/** Cabecera real de cada formato, seguida de relleno. */
const con = (...firma: number[]) => new Uint8Array([...firma, ...Array(24).fill(0)]);
const PNG = con(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const JPEG = con(0xff, 0xd8, 0xff, 0xe0);
const GIF = con(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, ...Array(16).fill(0)]);

describe('detectarTipo', () => {
  it('reconoce los cuatro formatos aceptados', () => {
    expect(detectarTipo(PNG)).toBe('png');
    expect(detectarTipo(JPEG)).toBe('jpeg');
    expect(detectarTipo(GIF)).toBe('gif');
    expect(detectarTipo(WEBP)).toBe('webp');
  });

  it('rechaza SVG aunque sea una imagen: es XML y puede traer scripts', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(detectarTipo(svg)).toBeNull();
  });

  it('rechaza un ejecutable o un HTML disfrazados', () => {
    expect(detectarTipo(new TextEncoder().encode('<!doctype html><script>x</script>'))).toBeNull();
    expect(detectarTipo(con(0x4d, 0x5a))).toBeNull();
    expect(detectarTipo(con(0x50, 0x4b, 0x03, 0x04))).toBeNull();
  });

  it('un RIFF que no es WebP no pasa', () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45, ...Array(16).fill(0)]);
    expect(detectarTipo(wav)).toBeNull();
  });

  it('no explota con archivos demasiado cortos', () => {
    expect(detectarTipo(new Uint8Array([0x89, 0x50]))).toBeNull();
    expect(detectarTipo(new Uint8Array())).toBeNull();
  });
});

describe('validarImagen', () => {
  it('acepta una imagen válida y le pone nombre propio', () => {
    const r = validarImagen(PNG);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.tipo).toBe('png');
    expect(r.mime).toBe('image/png');
    expect(r.nombre).toMatch(/^ad-\d+-[a-z0-9]+\.png$/);
  });

  it('la extensión sale del contenido real, no de lo que diga el cliente', () => {
    const r = validarImagen(JPEG);
    expect(r.ok && r.nombre.endsWith('.jpg')).toBe(true);
  });

  it('rechaza vacío', () => {
    for (const b of [null, undefined, new Uint8Array()]) {
      const r = validarImagen(b);
      expect(r.ok).toBe(false);
      expect(r.ok || r.error).toMatch(/ningún archivo/);
    }
  });

  it('rechaza lo que pasa del tamaño máximo', () => {
    const grande = new Uint8Array(MAX_BYTES + 1);
    grande.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const r = validarImagen(grande);
    expect(r.ok).toBe(false);
    expect(r.ok || r.error).toMatch(/MB/);
  });

  it('explica por qué no acepta SVG, en vez de un error mudo', () => {
    const r = validarImagen(new TextEncoder().encode('<svg></svg>'));
    expect(r.ok || r.error).toMatch(/SVG/);
  });
});

describe('nombreSeguro', () => {
  it('nunca reutiliza el nombre que mandó el cliente', () => {
    const n = nombreSeguro('png', () => 'abc123');
    expect(n).toMatch(/^ad-\d+-abc123\.png$/);
    expect(n).not.toContain('/');
    expect(n).not.toContain('..');
  });
});
