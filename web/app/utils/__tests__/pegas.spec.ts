import { describe, expect, it } from 'vitest';
import { formatDate, sourceLabel } from '../pegas';

describe('sourceLabel', () => {
  it('mapea fuentes conocidas a su nombre bonito', () => {
    expect(sourceLabel('getonbrd')).toBe('GetOnBoard');
    expect(sourceLabel('workingnomads')).toBe('WorkingNomads');
    expect(sourceLabel('jobicy')).toBe('Jobicy');
    expect(sourceLabel('himalayas')).toBe('Himalayas');
  });

  it('cae al valor crudo para fuentes desconocidas', () => {
    expect(sourceLabel('otra-fuente')).toBe('otra-fuente');
  });
});

describe('formatDate', () => {
  // Instantes en UTC a proposito: el formateo se ancla a la zona de Chile,
  // asi que el resultado no debe depender del huso donde corran los tests.
  const now = new Date('2026-08-15T15:00:00Z'); // 11:00 en Chile

  it('dice "hoy" para el mismo dia calendario chileno, sin importar la hora', () => {
    expect(formatDate('2026-08-15T23:59:00Z', now)).toBe('hoy'); // 19:59 en Chile
  });

  it('usa la fecha larga desde el dia anterior, aunque hayan pasado pocas horas', () => {
    expect(formatDate('2026-08-15T02:00:00Z', now)).toBe('14 Agosto 2026'); // 22:00 del 14 en Chile
  });

  it('usa la fecha larga para cualquier fecha mas antigua', () => {
    expect(formatDate('2026-01-01T14:05:00Z', now)).toBe('1 Enero 2026');
  });

  it('devuelve vacio para valores invalidos o ausentes', () => {
    expect(formatDate(null, now)).toBe('');
    expect(formatDate(undefined, now)).toBe('');
    expect(formatDate('no-es-una-fecha', now)).toBe('');
  });
});
