import { describe, expect, it } from 'vitest';
import { reasonLabel } from '../relacionadas';

describe('reasonLabel', () => {
  it('traduce los motivos que el front conoce', () => {
    expect(reasonLabel('empresa')).toBe('Misma empresa');
    expect(reasonLabel('categoria')).toBe('Misma categoría');
    expect(reasonLabel('sueldo')).toBe('Sueldo parecido');
    expect(reasonLabel('ubicacion')).toBe('Misma ubicación');
    expect(reasonLabel('remoto')).toBe('También remota');
    expect(reasonLabel('antiguedad')).toBe('Mismo nivel');
    expect(reasonLabel('comportamiento')).toBe('También la miraron');
  });

  /**
   * "Mismo stack" repetía el encabezado de la sección en el 93% de las
   * tarjetas. Sin etiqueta, la que sí aparece marca la excepción.
   */
  it('no pinta etiqueta para el motivo más común', () => {
    expect(reasonLabel('stack')).toBeNull();
  });

  /**
   * Lo que protege este test: pegas-core puede estrenar un motivo sin esperar
   * un despliegue del front, y mientras tanto la tarjeta sale sin etiqueta en
   * vez de mostrarle a la gente un identificador interno.
   */
  it('devuelve null para un motivo que todavía no tiene copy', () => {
    expect(reasonLabel('cohorte_v2')).toBeNull();
    expect(reasonLabel('')).toBeNull();
  });

  it('no hereda propiedades de Object.prototype', () => {
    expect(reasonLabel('constructor')).toBeNull();
    expect(reasonLabel('toString')).toBeNull();
  });
});
