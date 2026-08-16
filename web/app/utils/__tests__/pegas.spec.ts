import { describe, expect, it } from 'vitest';
import { formatDate, relativeLabel, sourceLabel } from '../pegas';

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

describe('relativeLabel', () => {
  const now = new Date('2026-08-15T12:00:00');

  it('dice "hoy" para el mismo dia calendario, sin importar la hora', () => {
    const laterToday = new Date('2026-08-15T23:59:00');
    expect(relativeLabel(laterToday, now)).toBe('hoy');
  });

  it('dice "ayer" para el dia calendario anterior, aunque hayan pasado pocas horas', () => {
    const lateYesterday = new Date('2026-08-14T23:00:00');
    expect(relativeLabel(lateYesterday, now)).toBe('ayer');
  });

  it('dice "hace Nd" para menos de una semana', () => {
    const threeDaysAgo = new Date('2026-08-12T12:00:00');
    expect(relativeLabel(threeDaysAgo, now)).toBe('hace 3d');
  });

  it('dice "hace Nsem" para menos de un mes', () => {
    const twoWeeksAgo = new Date('2026-08-01T12:00:00');
    expect(relativeLabel(twoWeeksAgo, now)).toBe('hace 2sem');
  });

  it('no dice nada para mas de un mes', () => {
    const longAgo = new Date('2026-01-01T12:00:00');
    expect(relativeLabel(longAgo, now)).toBeNull();
  });
});

describe('formatDate', () => {
  const now = new Date('2026-08-15T12:00:00');

  it('formatea con prefijo relativo cuando es reciente', () => {
    expect(formatDate('2026-08-15T14:05:00', now)).toBe('15/08/2026 14:05 - hoy');
  });

  it('formatea sin prefijo cuando es muy antiguo', () => {
    expect(formatDate('2026-01-01T14:05:00', now)).toBe('01/01/2026 14:05');
  });

  it('devuelve vacio para valores invalidos o ausentes', () => {
    expect(formatDate(null, now)).toBe('');
    expect(formatDate(undefined, now)).toBe('');
    expect(formatDate('no-es-una-fecha', now)).toBe('');
  });
});
