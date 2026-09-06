// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sanitizarHtml, TAGS_PERMITIDOS, tagsNoPermitidos, validarLink } from '../ads-sanitize';

/**
 * La mitad de estos casos son intentos de evasión conocidos, no ejemplos
 * inventados. Mientras esta suite pase, ninguno vuelve a colarse.
 */

/** Lo que nunca puede sobrevivir al saneo, mire uno donde mire. */
function esperarInofensivo(salida: string) {
  const s = salida.toLowerCase();
  expect(s).not.toContain('<script');
  expect(s).not.toContain('javascript:');
  expect(s).not.toContain('vbscript:');
  expect(s).not.toContain('<iframe');
  expect(s).not.toContain('<object');
  expect(s).not.toContain('<embed');
  expect(s).not.toContain('<svg');
  expect(s).not.toContain('<base');
  expect(s).not.toContain('<form');
  expect(s).not.toMatch(/\son[a-z]+\s*=/);

  // El chequeo fuerte: ningún tag fuera de la allowlist sobrevive. Que el
  // texto "alert(1)" quede como contenido escapado no es un problema -- se
  // renderiza como texto, no se ejecuta -- así que no se afirma sobre eso.
  for (const [, tag] of salida.matchAll(/<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g)) {
    expect(TAGS_PERMITIDOS).toContain(tag.toLowerCase());
  }
}

describe('sanitizarHtml — deja pasar lo legítimo', () => {
  it('conserva el HTML de un banner normal', () => {
    const salida = sanitizarHtml('<p><strong>Oferta</strong> por tiempo limitado</p>');
    expect(salida).toContain('<strong>Oferta</strong>');
    expect(salida).toContain('por tiempo limitado');
  });

  it('conserva imágenes y sus atributos permitidos', () => {
    const salida = sanitizarHtml('<img src="https://cdn.ejemplo.cl/b.png" alt="Banner" width="970">');
    expect(salida).toContain('src="https://cdn.ejemplo.cl/b.png"');
    expect(salida).toContain('alt="Banner"');
    expect(salida).toContain('width="970"');
  });

  it('conserva class, que el panel usa para maquetar', () => {
    expect(sanitizarHtml('<div class="banner-cta">x</div>')).toContain('class="banner-cta"');
  });

  it('es idempotente: sanear lo ya saneado no lo cambia', () => {
    const una = sanitizarHtml('<p>hola <a href="https://ejemplo.cl">link</a></p>');
    expect(sanitizarHtml(una)).toBe(una);
  });

  it('no explota con entradas vacías o raras', () => {
    for (const x of ['', '   ', 'texto pelado sin tags']) {
      expect(() => sanitizarHtml(x)).not.toThrow();
    }
  });
});

describe('sanitizarHtml — fuerza el blindaje de los anchors', () => {
  it('agrega noopener y noreferrer aunque no vengan', () => {
    const salida = sanitizarHtml('<a href="https://ejemplo.cl">ir</a>');
    expect(salida).toContain('rel="noopener noreferrer"');
    expect(salida).toContain('target="_blank"');
  });

  it('pisa un rel que venga debilitado en el HTML pegado', () => {
    const salida = sanitizarHtml('<a href="https://ejemplo.cl" rel="opener">ir</a>');
    expect(salida).toContain('rel="noopener noreferrer"');
    expect(salida).not.toContain('rel="opener"');
  });
});

describe('sanitizarHtml — evasiones conocidas', () => {
  const vectores: Array<[string, string]> = [
    ['script simple', '<script>alert(1)</script>'],
    ['script anidado para burlar un reemplazo ingenuo', '<scr<script>ipt>alert(1)</scr</script>ipt>'],
    ['onerror en una imagen', '<img src=x onerror=alert(1)>'],
    ['onclick en un párrafo', '<p onclick="alert(1)">texto</p>'],
    ['onload en svg sin espacio', '<svg/onload=alert(1)>'],
    ['href javascript en minúscula', '<a href="javascript:alert(1)">x</a>'],
    ['href javascript alternando mayúsculas', '<a href="JaVaScRiPt:alert(1)">x</a>'],
    ['href javascript con espacio adelante', '<a href="  javascript:alert(1)">x</a>'],
    ['href javascript con entidad HTML', '<a href="&#106;avascript:alert(1)">x</a>'],
    ['href javascript con tab en medio del esquema', '<a href="jav&#x09;ascript:alert(1)">x</a>'],
    ['src con data: y html adentro', '<img src="data:text/html,<script>alert(1)</script>">'],
    ['vbscript', '<a href="vbscript:msgbox(1)">x</a>'],
    ['iframe', '<iframe src="https://evil.cl"></iframe>'],
    ['object', '<object data="https://evil.cl"></object>'],
    ['embed', '<embed src="https://evil.cl">'],
    ['form que roba credenciales', '<form action="https://evil.cl"><input name="pass"></form>'],
    ['base que reescribe todos los links', '<base href="https://evil.cl/">'],
    ['style con url(javascript:)', '<div style="background:url(javascript:alert(1))">x</div>'],
    ['bloque style completo', '<style>body{background:url("javascript:alert(1)")}</style>'],
    ['mXSS clásico con mglyph', '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>'],
    ['meta refresh', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'],
    ['link a hoja de estilo externa', '<link rel="stylesheet" href="https://evil.cl/x.css">'],
  ];

  for (const [nombre, entrada] of vectores) {
    it(nombre, () => esperarInofensivo(sanitizarHtml(entrada)));
  }

  it('no deja el contenido de un script suelto como texto', () => {
    // Sin nonTextTags el tag se va pero "alert(1)" queda impreso en el banner.
    expect(sanitizarHtml('<script>alert(1)</script>')).toBe('');
    expect(sanitizarHtml('<style>.x{color:red}</style>')).toBe('');
  });

  it('descarta el esquema relativo al protocolo', () => {
    expect(sanitizarHtml('<a href="//evil.cl">x</a>')).not.toContain('//evil.cl');
  });
});

describe('validarLink', () => {
  it('acepta http y https, y normaliza', () => {
    expect(validarLink('https://ejemplo.cl/x')).toBe('https://ejemplo.cl/x');
    expect(validarLink('http://ejemplo.cl')).toBe('http://ejemplo.cl/');
    expect(validarLink('  https://ejemplo.cl/y  ')).toBe('https://ejemplo.cl/y');
  });

  it('rechaza todo protocolo que ejecute código', () => {
    for (const x of [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'ftp://ejemplo.cl',
    ]) {
      expect(validarLink(x)).toBeNull();
    }
  });

  it('rechaza caracteres de control usados para partir filtros', () => {
    expect(validarLink('java\u0009script:alert(1)')).toBeNull();
    expect(validarLink('https://ejemplo.cl/\u000afoo')).toBeNull();
    expect(validarLink('https://ejemplo.cl/\u0000')).toBeNull();
  });

  it('rechaza lo que no es una URL absoluta', () => {
    for (const x of ['', '   ', '/dev/banner.svg', 'ejemplo.cl', '//evil.cl', 'no es una url']) {
      expect(validarLink(x)).toBeNull();
    }
  });

  it('rechaza lo que ni siquiera es texto', () => {
    for (const x of [null, undefined, 0, 42, {}, [], true]) {
      expect(validarLink(x)).toBeNull();
    }
  });
});

describe('tagsNoPermitidos', () => {
  it('lista lo que el saneo va a quitar, para poder avisarlo', () => {
    expect(tagsNoPermitidos('<script></script><iframe></iframe><p>ok</p>')).toEqual([
      'iframe',
      'script',
    ]);
  });

  it('no reporta nada cuando el HTML ya está dentro de la allowlist', () => {
    expect(tagsNoPermitidos('<p><strong>x</strong><a href="https://ejemplo.cl">y</a></p>')).toEqual(
      [],
    );
  });

  it('no se deja engañar por mayúsculas ni por espacios en el tag', () => {
    expect(tagsNoPermitidos('<  SCRIPT >')).toEqual(['script']);
  });
});
