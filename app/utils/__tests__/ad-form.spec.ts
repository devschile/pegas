import { describe, expect, it } from 'vitest';
import { ALTO_MAX, PASOS, problemasDeTodo, problemasDelPaso, type FormularioAd } from '../ad-form';

const base = (extra: Partial<FormularioAd> = {}): FormularioAd => ({
  empresa_id: 1,
  nombre: 'Campaña',
  formato: 'imagen',
  imagen_desktop_url: 'https://cdn.invalid/d.png',
  imagen_movil_url: 'https://cdn.invalid/m.png',
  alt: 'Un banner',
  html: '',
  alto_desktop: '',
  alto_movil: '',
  link: 'https://destino.invalid',
  activo: false,
  ubicaciones: ['header'],
  ...extra,
});

describe('PASOS', () => {
  it('termina en la revisión: publicar es lo último', () => {
    expect(PASOS.at(-1)?.id).toBe('revision');
  });
});

describe('problemasDelPaso — anunciante', () => {
  it('un formulario completo no tiene problemas', () => {
    expect(problemasDelPaso('anunciante', base())).toEqual([]);
  });

  it('exige empresa y nombre', () => {
    const p = problemasDelPaso('anunciante', base({ empresa_id: null, nombre: '   ' }));
    expect(p).toHaveLength(2);
  });
});

describe('problemasDelPaso — pieza', () => {
  it('un ad de imagen necesita las dos imágenes y el alt', () => {
    const p = problemasDelPaso('pieza', base({ imagen_desktop_url: '', imagen_movil_url: '', alt: '' }));
    expect(p).toHaveLength(3);
    expect(p.join(' ')).toContain('mitad del tráfico');
  });

  it('rechaza imágenes que no son https', () => {
    const p = problemasDelPaso('pieza', base({ imagen_desktop_url: 'http://cdn.invalid/d.png' }));
    expect(p.join(' ')).toContain('https');
  });

  it('un ad html solo necesita el html, no las imágenes', () => {
    expect(problemasDelPaso('pieza', base({ formato: 'html', imagen_desktop_url: '', imagen_movil_url: '', alt: '', html: '<b>hola</b>' }))).toEqual([]);
    expect(problemasDelPaso('pieza', base({ formato: 'html', html: '  ' }))).toHaveLength(1);
  });

  it('el alto vacío es válido: significa "usa el que traiga"', () => {
    expect(problemasDelPaso('pieza', base({ alto_desktop: '', alto_movil: '' }))).toEqual([]);
  });

  it('rechaza altos fuera del rango que acepta la base', () => {
    expect(problemasDelPaso('pieza', base({ alto_desktop: '0' }))).toHaveLength(1);
    expect(problemasDelPaso('pieza', base({ alto_movil: String(ALTO_MAX + 1) }))).toHaveLength(1);
    expect(problemasDelPaso('pieza', base({ alto_desktop: '90.5' }))).toHaveLength(1);
    expect(problemasDelPaso('pieza', base({ alto_desktop: '120' }))).toEqual([]);
  });
});

describe('problemasDelPaso — donde', () => {
  it('exige al menos una ubicación', () => {
    expect(problemasDelPaso('donde', base({ ubicaciones: [] }))).toHaveLength(1);
  });

  it('un ad de imagen exige link; uno de html no', () => {
    expect(problemasDelPaso('donde', base({ link: '' }))).toHaveLength(1);
    expect(problemasDelPaso('donde', base({ formato: 'html', link: '' }))).toEqual([]);
  });

  it('rechaza un link sin protocolo', () => {
    expect(problemasDelPaso('donde', base({ link: 'destino.invalid' })).join(' ')).toContain('http://');
  });
});

describe('problemasDeTodo', () => {
  it('junta lo que falta en todos los pasos', () => {
    expect(problemasDeTodo(base())).toEqual([]);
    expect(problemasDeTodo(base({ nombre: '', ubicaciones: [] }))).toHaveLength(2);
  });
});
