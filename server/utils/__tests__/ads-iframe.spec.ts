// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  construirSrcdoc,
  CSP_DEL_AD,
  esDocumentoCompleto,
  parsearMensajeDelAd,
  scriptDelSobre,
} from '../ads-iframe';

/**
 * `documentoDeAnunciante` imita la forma de la pieza de referencia: documento
 * completo, con `<style>` en el head, tema por `html[data-theme]` y un script
 * propio al final del body.
 */
const documentoDeAnunciante = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>.b{background:#fff}html[data-theme='dark'] .b{background:#000}</style>
</head>
<body>
<div class="b">Oferta <a href="https://ejemplo.invalid/x">Ver</a></div>
<script>console.log('del anunciante')<\/script>
</body>
</html>`;

describe('esDocumentoCompleto', () => {
  it('reconoce un documento con <html>', () => {
    expect(esDocumentoCompleto(documentoDeAnunciante)).toBe(true);
    expect(esDocumentoCompleto('<html><body>x</body></html>')).toBe(true);
  });

  it('trata como fragmento lo que no lo tiene', () => {
    expect(esDocumentoCompleto('<div>x</div>')).toBe(false);
    expect(esDocumentoCompleto('')).toBe(false);
    // "htmlspecialchars" no es un tag: exige el borde después de "html".
    expect(esDocumentoCompleto('<htmlspecial>x</htmlspecial>')).toBe(false);
  });
});

describe('CSP_DEL_AD', () => {
  it('bloquea la salida de datos del ad', () => {
    expect(CSP_DEL_AD).toContain("connect-src 'none'");
    expect(CSP_DEL_AD).toContain("default-src 'none'");
    expect(CSP_DEL_AD).toContain("form-action 'none'");
    expect(CSP_DEL_AD).toContain("base-uri 'none'");
    expect(CSP_DEL_AD).toContain("frame-src 'none'");
  });

  it('permite el JS que vino en el documento pero no scripts externos', () => {
    expect(CSP_DEL_AD).toContain("script-src 'unsafe-inline'");
    expect(CSP_DEL_AD).not.toMatch(/script-src[^;]*https:/);
  });

  it('permite fuentes en base64, que es como llegan las piezas cuidadas', () => {
    expect(CSP_DEL_AD).toMatch(/font-src[^;]*data:/);
  });
});

describe('construirSrcdoc — documento completo', () => {
  const salida = construirSrcdoc(documentoDeAnunciante, 7, 'dark');

  it('no anida un <html> dentro de otro', () => {
    expect(salida.match(/<html\b/gi)).toHaveLength(1);
  });

  it('conserva el contenido del anunciante', () => {
    expect(salida).toContain('Oferta');
    expect(salida).toContain("console.log('del anunciante')");
    expect(salida).toContain('https://ejemplo.invalid/x');
  });

  it('inyecta la CSP dentro del head', () => {
    expect(salida).toContain(CSP_DEL_AD);
    const iHead = salida.toLowerCase().indexOf('<head');
    const iCsp = salida.indexOf('Content-Security-Policy');
    expect(iHead).toBeGreaterThan(-1);
    expect(iCsp).toBeGreaterThan(iHead);
  });

  it('pone el tema en el <html> del anunciante, que es contra el que escribió su CSS', () => {
    expect(salida).toMatch(/<html[^>]*data-theme="dark"/i);
  });

  it('inyecta el script del sobre antes de cerrar el body', () => {
    expect(salida).toContain('pegas-ad');
    expect(salida.indexOf('pegas-ad')).toBeLessThan(salida.toLowerCase().lastIndexOf('</body>'));
  });

  it('lleva el id del ad, para que el host sepa quién le habla', () => {
    expect(salida).toContain('var ID = 7');
  });
});

describe('construirSrcdoc — casos límite del HTML pegado', () => {
  it('envuelve un fragmento suelto', () => {
    const salida = construirSrcdoc('<div>hola</div>', 1);
    expect(salida.startsWith('<!doctype html>')).toBe(true);
    expect(salida).toContain('<div>hola</div>');
    expect(salida).toContain(CSP_DEL_AD);
    expect(salida).toContain('pegas-ad');
  });

  it('no duplica data-theme si el anunciante ya traía uno', () => {
    const salida = construirSrcdoc(`<html data-theme="light"><body>x</body></html>`, 2, 'dark');
    expect(salida.match(/data-theme=/g)).toHaveLength(1);
    expect(salida).toContain('data-theme="dark"');
  });

  it('conserva los demás atributos del <html>', () => {
    const salida = construirSrcdoc(`<html lang="es" class="k"><body>x</body></html>`, 3, 'dark');
    expect(salida).toMatch(/lang="es"/);
    expect(salida).toMatch(/class="k"/);
  });

  it('crea un head si el documento no tenía', () => {
    const salida = construirSrcdoc('<html><body>x</body></html>', 4);
    expect(salida).toContain(CSP_DEL_AD);
    expect(salida.indexOf('Content-Security-Policy')).toBeLessThan(salida.indexOf('<body'));
  });

  it('agrega el script al final si no hay </body>', () => {
    const salida = construirSrcdoc('<html><body>x', 5);
    expect(salida).toContain('pegas-ad');
  });

  it('no explota con html vacío', () => {
    expect(() => construirSrcdoc('', 6)).not.toThrow();
    expect(construirSrcdoc('', 6)).toContain(CSP_DEL_AD);
  });

  it('el tema por defecto es claro', () => {
    expect(construirSrcdoc('<div>x</div>', 8)).toContain('data-theme="light"');
  });
});

describe('scriptDelSobre', () => {
  const s = scriptDelSobre(42);

  it('reporta alto y clicks, y escucha el tema', () => {
    expect(s).toContain('ResizeObserver');
    expect(s).toContain("avisar('alto'");
    expect(s).toContain("avisar('click'");
    expect(s).toContain('pegas-host');
  });

  it('intercepta el click en fase de captura, para ganarle al handler del ad', () => {
    expect(s).toMatch(/addEventListener\('click'[\s\S]*?,\s*true\)/);
    expect(s).toContain('preventDefault');
  });

  it('no cierra el script antes de tiempo', () => {
    // Un "</script>" dentro del código rompería el <script> que lo contiene.
    expect(s).not.toContain('</script>');
  });
});

describe('parsearMensajeDelAd', () => {
  it('acepta un alto válido', () => {
    expect(parsearMensajeDelAd({ fuente: 'pegas-ad', id: 3, tipo: 'alto', alto: 56 })).toEqual({
      fuente: 'pegas-ad',
      id: 3,
      tipo: 'alto',
      alto: 56,
    });
  });

  it('acepta un click con destino', () => {
    expect(
      parsearMensajeDelAd({ fuente: 'pegas-ad', id: 3, tipo: 'click', href: 'https://x.cl' }),
    ).toEqual({ fuente: 'pegas-ad', id: 3, tipo: 'click', href: 'https://x.cl' });
  });

  it('ignora mensajes de cualquier otro emisor de la página', () => {
    for (const basura of [
      null,
      undefined,
      'texto',
      42,
      {},
      { fuente: 'otra-cosa', id: 1, tipo: 'alto', alto: 10 },
      { fuente: 'pegas-host', id: 1, tipo: 'alto', alto: 10 },
    ]) {
      expect(parsearMensajeDelAd(basura)).toBeNull();
    }
  });

  it('exige un id entero', () => {
    for (const id of ['3', 3.5, null, undefined, NaN]) {
      expect(parsearMensajeDelAd({ fuente: 'pegas-ad', id, tipo: 'alto', alto: 10 })).toBeNull();
    }
  });

  it('rechaza un alto absurdo, que empujaría el listado fuera de la pantalla', () => {
    for (const alto of [0, -10, 601, 99999, Infinity, NaN, '56', null]) {
      expect(parsearMensajeDelAd({ fuente: 'pegas-ad', id: 1, tipo: 'alto', alto })).toBeNull();
    }
  });

  it('rechaza un tipo que no conocemos', () => {
    expect(parsearMensajeDelAd({ fuente: 'pegas-ad', id: 1, tipo: 'navegar', href: 'x' })).toBeNull();
  });

  it('exige que el click traiga href', () => {
    expect(parsearMensajeDelAd({ fuente: 'pegas-ad', id: 1, tipo: 'click' })).toBeNull();
  });
});
