// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  elegirAd,
  getAdsElegibles,
  getAdsPorUbicacion,
  limpiar,
  parseUbicacion,
  UBICACIONES,
  type AdPublico,
} from '../index.get';

const queryMock = vi.fn();

vi.mock('../../../utils/db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

function ad(over: Partial<AdPublico> & { ubicaciones?: string[] } = {}) {
  return {
    id: 1,
    formato: 'imagen' as const,
    imagen_desktop_url: '/d.svg',
    imagen_movil_url: '/m.svg',
    alt: 'x',
    html: null,
    alto_desktop: null,
    alto_movil: null,
    link: 'https://ejemplo.invalid',
    empresa_nombre: 'Panguipulli Labs',
    es_casa: false,
    ubicaciones: ['header'],
    ...over,
  };
}

describe('parseUbicacion', () => {
  it('acepta las tres ubicaciones conocidas', () => {
    for (const u of UBICACIONES) expect(parseUbicacion(u)).toBe(u);
  });

  it('descarta cualquier otra cosa en vez de pasarla a SQL', () => {
    for (const basura of ['sidebar', '', "header' OR 1=1--", 0, null, undefined, {}, ['header']]) {
      expect(parseUbicacion(basura)).toBeNull();
    }
  });
});

describe('getAdsElegibles', () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [] });
  });

  it('exige que el ad y su empresa estén prendidos', async () => {
    await getAdsElegibles();
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toMatch(/a\.activo/);
    expect(sql).toMatch(/e\.activo/);
  });

  it('respeta la vigencia y la resuelve en la base, no en Node', async () => {
    await getAdsElegibles();
    const sql = queryMock.mock.calls[0][0];
    expect(sql).toMatch(/inicia_en IS NULL OR a\.inicia_en <= now\(\)/);
    expect(sql).toMatch(/termina_en IS NULL OR a\.termina_en > now\(\)/);
  });

  it('no expone metadatos internos ni datos de contacto', async () => {
    await getAdsElegibles();
    const sql = queryMock.mock.calls[0][0];
    for (const columna of ['contacto_email', 'creado_por', 'fecha_creacion', 'fecha_actualizacion']) {
      expect(sql).not.toMatch(new RegExp(`\\b${columna}\\b`));
    }
  });

  it('filtra por ubicación de forma parametrizada', async () => {
    await getAdsElegibles('footer');
    expect(queryMock.mock.calls[0][0]).toMatch(/\$1 = ANY \(a\.ubicaciones\)/);
    expect(queryMock.mock.calls[0][1]).toEqual(['footer']);
  });
});

describe('elegirAd', () => {
  it('sin candidatos devuelve null', () => {
    expect(elegirAd([])).toBeNull();
  });

  it('lo vendido le gana a lo de casa aunque la casa vaya primero', () => {
    const casa = ad({ id: 1, es_casa: true, empresa_nombre: 'devsChile' });
    const vendido = ad({ id: 2, es_casa: false });
    // azar fijo en 0: sin la preferencia elegiría el primero, que es el de casa.
    expect(elegirAd([casa, vendido], () => 0)?.id).toBe(2);
  });

  it('usa el de casa solo cuando no hay nada vendido', () => {
    const casa = ad({ id: 9, es_casa: true });
    expect(elegirAd([casa], () => 0)?.id).toBe(9);
  });

  it('sortea entre los vendidos para repartir impresiones', () => {
    const candidatos = [ad({ id: 10 }), ad({ id: 11 }), ad({ id: 12 })];
    expect(elegirAd(candidatos, () => 0)?.id).toBe(10);
    expect(elegirAd(candidatos, () => 0.5)?.id).toBe(11);
    expect(elegirAd(candidatos, () => 0.99)?.id).toBe(12);
  });

  it('no se sale del arreglo si el azar devuelve 1', () => {
    const candidatos = [ad({ id: 10 }), ad({ id: 11 })];
    expect(elegirAd(candidatos, () => 1)).not.toBeNull();
  });
});

describe('limpiar', () => {
  it('saca ubicaciones, que solo servía para repartir', () => {
    const salida = limpiar(ad({ id: 3 }) as AdPublico);
    expect(salida).not.toHaveProperty('ubicaciones');
    expect(salida?.id).toBe(3);
  });

  it('deja pasar el null', () => {
    expect(limpiar(null)).toBeNull();
  });
});

describe('getAdsPorUbicacion', () => {
  beforeEach(() => queryMock.mockReset());

  it('devuelve una entrada por ubicación, con null donde no hay nada', async () => {
    queryMock.mockResolvedValue({ rows: [ad({ id: 5, ubicaciones: ['header'] })] });
    const salida = await getAdsPorUbicacion(() => 0);
    expect(Object.keys(salida).sort()).toEqual([...UBICACIONES].sort());
    expect(salida.header?.id).toBe(5);
    expect(salida.listado).toBeNull();
    expect(salida.footer).toBeNull();
  });

  it('un ad en varias ubicaciones aparece en todas las suyas', async () => {
    queryMock.mockResolvedValue({ rows: [ad({ id: 6, ubicaciones: ['header', 'footer'] })] });
    const salida = await getAdsPorUbicacion(() => 0);
    expect(salida.header?.id).toBe(6);
    expect(salida.footer?.id).toBe(6);
    expect(salida.listado).toBeNull();
  });

  it('resuelve la preferencia por ubicación, no globalmente', async () => {
    queryMock.mockResolvedValue({
      rows: [
        ad({ id: 1, es_casa: true, ubicaciones: ['header', 'footer'] }),
        ad({ id: 2, es_casa: false, ubicaciones: ['header'] }),
      ],
    });
    const salida = await getAdsPorUbicacion(() => 0);
    // En header hay vendido, así que gana. En footer solo está el de casa.
    expect(salida.header?.id).toBe(2);
    expect(salida.footer?.id).toBe(1);
  });

  it('una sola consulta para las tres ubicaciones', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await getAdsPorUbicacion(() => 0);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });
});
