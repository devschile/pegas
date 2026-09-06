// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validarAd, validarEmpresa } from '../ads-validacion';

const adImagen = (over: Record<string, unknown> = {}) => ({
  empresa_id: 1,
  nombre: 'Campaña septiembre',
  formato: 'imagen',
  imagen_desktop_url: 'https://cdn.ejemplo.invalid/d.png',
  imagen_movil_url: 'https://cdn.ejemplo.invalid/m.png',
  alt: 'Ejemplo contrata',
  link: 'https://ejemplo.invalid/oferta',
  ubicaciones: ['header'],
  ...over,
});

const adHtml = (over: Record<string, unknown> = {}) => ({
  empresa_id: 1,
  nombre: 'Pieza HTML',
  formato: 'html',
  html: '<div>hola</div>',
  ubicaciones: ['listado'],
  ...over,
});

/** Atajo: espera rechazo y devuelve el mensaje, para poder afirmar sobre él. */
function rechazo(body: unknown): string {
  const r = validarAd(body);
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.error;
}

describe('validarAd — camino feliz', () => {
  it('acepta un ad de imagen completo', () => {
    const r = validarAd(adImagen());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.formato).toBe('imagen');
    expect(r.valor.html).toBeNull();
    expect(r.valor.ubicaciones).toEqual(['header']);
  });

  it('acepta un ad de html', () => {
    const r = validarAd(adHtml());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.imagen_desktop_url).toBeNull();
    expect(r.valor.html).toBe('<div>hola</div>');
  });

  it('arranca apagado salvo que se pida lo contrario', () => {
    const r = validarAd(adImagen());
    expect(r.ok && r.valor.activo).toBe(false);
    const r2 = validarAd(adImagen({ activo: true }));
    expect(r2.ok && r2.valor.activo).toBe(true);
  });

  it('recorta los espacios de los textos', () => {
    const r = validarAd(adImagen({ nombre: '  Campaña  ' }));
    expect(r.ok && r.valor.nombre).toBe('Campaña');
  });

  it('acepta las tres ubicaciones a la vez', () => {
    const r = validarAd(adImagen({ ubicaciones: ['header', 'listado', 'footer'] }));
    expect(r.ok).toBe(true);
  });

  it('acepta vigencia coherente', () => {
    const r = validarAd(adImagen({ inicia_en: '2026-09-01T00:00:00Z', termina_en: '2026-10-01T00:00:00Z' }));
    expect(r.ok).toBe(true);
  });
});

describe('validarAd — los dos formatos son excluyentes', () => {
  it('una imagen sin versión móvil se rechaza: se vería rota en la mitad del tráfico', () => {
    expect(rechazo(adImagen({ imagen_movil_url: null }))).toMatch(/imagen_movil_url/);
  });

  it('una imagen sin link no es un banner', () => {
    expect(rechazo(adImagen({ link: null }))).toMatch(/link/);
  });

  it('una imagen sin alt se rechaza, por accesibilidad', () => {
    expect(rechazo(adImagen({ alt: null }))).toMatch(/alt/);
    expect(rechazo(adImagen({ alt: '   ' }))).toMatch(/alt/);
  });

  it('una imagen no puede traer html', () => {
    expect(rechazo(adImagen({ html: '<p>x</p>' }))).toMatch(/no lleva html/);
  });

  it('un html no puede traer imágenes', () => {
    expect(rechazo(adHtml({ imagen_desktop_url: 'https://x.cl/a.png' }))).toMatch(/no lleva imágenes/);
  });

  it('un html vacío se rechaza', () => {
    for (const html of [null, '', '   ', 42]) expect(rechazo(adHtml({ html }))).toMatch(/html/);
  });

  it('un formato inventado se rechaza', () => {
    expect(rechazo(adImagen({ formato: 'video' }))).toMatch(/formato/);
  });
});

describe('validarAd — la API es más estricta que la base', () => {
  it('las imágenes tienen que ser https', () => {
    for (const url of [
      'http://cdn.ejemplo.invalid/d.png',
      '/dev/banner.svg',
      'data:image/svg+xml,x',
      'javascript:alert(1)',
      'cdn.ejemplo.invalid/d.png',
    ]) {
      expect(rechazo(adImagen({ imagen_desktop_url: url }))).toMatch(/https/);
    }
  });

  it('el link se valida por protocolo', () => {
    for (const link of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.cl', 'no-es-url']) {
      expect(rechazo(adImagen({ link }))).toMatch(/link/);
    }
  });
});

describe('validarAd — ubicaciones', () => {
  it('exige al menos una', () => {
    for (const u of [[], null, undefined, 'header', {}]) {
      expect(rechazo(adImagen({ ubicaciones: u }))).toMatch(/ubicaciones/);
    }
  });

  it('rechaza una inventada', () => {
    expect(rechazo(adImagen({ ubicaciones: ['sidebar'] }))).toMatch(/ubicaciones/);
    expect(rechazo(adImagen({ ubicaciones: ['header', 'sidebar'] }))).toMatch(/ubicaciones/);
  });

  it('rechaza repetidas: duplicarían el peso del ad en el sorteo', () => {
    expect(rechazo(adImagen({ ubicaciones: ['header', 'header'] }))).toMatch(/sin repetir/);
  });
});

describe('validarAd — altos y vigencia', () => {
  it('acota el alto al mismo rango que la migración', () => {
    for (const alto of [0, -1, 601, 1.5, '56']) {
      expect(rechazo(adHtml({ alto_desktop: alto }))).toMatch(/alto_desktop/);
    }
    expect(validarAd(adHtml({ alto_desktop: 56, alto_movil: 88 })).ok).toBe(true);
  });

  it('rechaza fechas inválidas', () => {
    expect(rechazo(adImagen({ inicia_en: 'ayer' }))).toMatch(/inicia_en/);
    expect(rechazo(adImagen({ termina_en: 'pronto' }))).toMatch(/termina_en/);
  });

  it('rechaza una vigencia invertida', () => {
    expect(
      rechazo(adImagen({ inicia_en: '2026-10-01T00:00:00Z', termina_en: '2026-09-01T00:00:00Z' })),
    ).toMatch(/posterior/);
  });
});

describe('validarAd — cuerpo basura', () => {
  it('rechaza lo que no es un objeto', () => {
    for (const b of [null, undefined, 'texto', 42, [], true]) {
      expect(rechazo(b)).toMatch(/objeto/);
    }
  });

  it('exige empresa_id entero positivo', () => {
    for (const id of [0, -3, 1.5, '1', null, undefined]) {
      expect(rechazo(adImagen({ empresa_id: id }))).toMatch(/empresa_id/);
    }
  });

  it('exige nombre', () => {
    for (const n of [null, '', '   ', 42]) expect(rechazo(adImagen({ nombre: n }))).toMatch(/nombre/);
  });
});

describe('validarEmpresa', () => {
  const base = { nombre: 'Panguipulli Labs', slug: 'panguipulli-labs' };

  it('acepta lo mínimo y deja la empresa prendida', () => {
    const r = validarEmpresa(base);
    expect(r.ok).toBe(true);
    expect(r.ok && r.valor.activo).toBe(true);
    expect(r.ok && r.valor.es_casa).toBe(false);
  });

  it('valida el formato del slug, que va a URLs y a nombres de archivo', () => {
    for (const slug of ['Con Mayúsculas', 'con espacios', 'con_guion_bajo', '-empieza-con-guion', 'termina-', 'acentué', '']) {
      const r = validarEmpresa({ ...base, slug });
      expect(r.ok).toBe(false);
      expect(r.ok || r.error).toMatch(/slug/);
    }
    expect(validarEmpresa({ ...base, slug: 'a1-b2-c3' }).ok).toBe(true);
  });

  it('valida el sitio por protocolo', () => {
    expect(validarEmpresa({ ...base, sitio_url: 'javascript:alert(1)' }).ok).toBe(false);
    expect(validarEmpresa({ ...base, sitio_url: 'https://ejemplo.invalid' }).ok).toBe(true);
    expect(validarEmpresa({ ...base, sitio_url: null }).ok).toBe(true);
  });

  it('valida el correo de contacto', () => {
    for (const email of ['no-es-correo', 'a@b', '@b.cl', 'a b@c.cl']) {
      expect(validarEmpresa({ ...base, contacto_email: email }).ok).toBe(false);
    }
    expect(validarEmpresa({ ...base, contacto_email: 'hola@ejemplo.invalid' }).ok).toBe(true);
  });

  it('permite marcarla como de casa', () => {
    const r = validarEmpresa({ ...base, es_casa: true });
    expect(r.ok && r.valor.es_casa).toBe(true);
  });

  it('rechaza cuerpo basura y nombre vacío', () => {
    expect(validarEmpresa(null).ok).toBe(false);
    expect(validarEmpresa({ slug: 'x' }).ok).toBe(false);
  });
});
