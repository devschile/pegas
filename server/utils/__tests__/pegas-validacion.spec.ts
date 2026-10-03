// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { validarPegaEntrada } from '../pegas-validacion';

const ENTRADA_VALIDA = {
  url: 'https://app.genoma.work/sky-airline/abc',
  titulo: 'Desarrollador',
  empleador: 'Sky Airline',
  descripcion: 'Se busca desarrollador backend.',
  categoria: 'Tecnología',
  ubicacion: 'Santiago, Chile',
};

describe('validarPegaEntrada', () => {
  it('acepta una entrada completa y recorta espacios', () => {
    const r = validarPegaEntrada({ ...ENTRADA_VALIDA, titulo: '  Desarrollador  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.titulo).toBe('Desarrollador');
  });

  it('rechaza un cuerpo que no es objeto', () => {
    expect(validarPegaEntrada('nada').ok).toBe(false);
    expect(validarPegaEntrada(null).ok).toBe(false);
    expect(validarPegaEntrada([1, 2]).ok).toBe(false);
  });

  it.each(['url', 'titulo', 'empleador', 'descripcion', 'categoria', 'ubicacion'])(
    '%s es obligatorio',
    campo => {
      const r = validarPegaEntrada({ ...ENTRADA_VALIDA, [campo]: '' });
      expect(r.ok).toBe(false);
    },
  );

  it('rechaza una url que no sea http/https', () => {
    const r = validarPegaEntrada({ ...ENTRADA_VALIDA, url: 'javascript:alert(1)' });
    expect(r.ok).toBe(false);
  });

  it('sueldo, tags y fecha_publicacion son opcionales', () => {
    const r = validarPegaEntrada(ENTRADA_VALIDA);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.valor.sueldo).toBeNull();
      expect(r.valor.tags).toBeNull();
      expect(r.valor.fecha_publicacion).toBeNull();
    }
  });

  it('rechaza una fecha_publicacion inválida', () => {
    const r = validarPegaEntrada({ ...ENTRADA_VALIDA, fecha_publicacion: 'no es una fecha' });
    expect(r.ok).toBe(false);
  });

  it('acepta una fecha_publicacion válida', () => {
    const r = validarPegaEntrada({ ...ENTRADA_VALIDA, fecha_publicacion: '2026-10-01' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valor.fecha_publicacion).toBe('2026-10-01');
  });
});
