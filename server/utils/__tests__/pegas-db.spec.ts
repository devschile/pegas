// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buscarPegaPorUrl, buscarPegasSimilares, crearPega } from '../pegas-db';
import type { PegaEntrada } from '../pegas-validacion';

const queryMock = vi.fn();

vi.mock('../db', () => ({
  query: (...args: unknown[]) => queryMock(...args),
}));

beforeEach(() => {
  queryMock.mockReset();
});

const entrada: PegaEntrada = {
  url: 'https://app.genoma.work/sky-airline/abc',
  titulo: 'Desarrollador',
  empleador: 'Sky Airline',
  descripcion: 'Se busca desarrollador backend.',
  categoria: 'Tecnología',
  ubicacion: 'Santiago, Chile',
  sueldo: null,
  tags: null,
  fecha_publicacion: null,
};

describe('buscarPegaPorUrl', () => {
  it('devuelve null si no hay ninguna fila', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    expect(await buscarPegaPorUrl('https://x.cl')).toBeNull();
  });

  it('filtra por url exacta', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 1, titulo: 'X' }] });
    await buscarPegaPorUrl('https://x.cl');
    expect(queryMock.mock.calls[0][0]).toMatch(/WHERE url = \$1/);
    expect(queryMock.mock.calls[0][1]).toEqual(['https://x.cl']);
  });
});

describe('crearPega', () => {
  it('inserta con fuente manual y activo en true, sin tocar lo que puso quien llama', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 5, ...entrada, likes: 0, dislikes: 0, guardados: 0 }] });
    const pega = await crearPega(entrada);

    expect(pega.id).toBe(5);
    const [sql, valores] = queryMock.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO pegas/);
    expect(sql).toMatch(/'manual'/);
    expect(sql).toMatch(/TRUE/);
    expect(valores).toEqual([
      entrada.url, entrada.titulo, entrada.empleador, entrada.descripcion, entrada.categoria,
      entrada.ubicacion, entrada.sueldo, entrada.tags, entrada.fecha_publicacion,
    ]);
  });
});

describe('buscarPegasSimilares', () => {
  it('sin título ni empleador no consulta candidatas, solo la url exacta', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }); // buscarPegaPorUrl
    const r = await buscarPegasSimilares({ titulo: '', empleador: '', url: 'https://x.cl' });
    expect(r).toEqual({ exacta: null, similares: [] });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('sin url no busca duplicado exacto', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }); // candidatas
    const r = await buscarPegasSimilares({ titulo: 'Desarrollador', empleador: '', url: '' });
    expect(r.exacta).toBeNull();
  });

  it('arma el filtro solo con los campos que llegaron, sin ILIKE %% que matchee todo', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // buscarPegaPorUrl
      .mockResolvedValueOnce({ rows: [] }); // candidatas
    await buscarPegasSimilares({ titulo: '', empleador: 'Sky Airline', url: 'https://x.cl' });

    const [sql, valores] = queryMock.mock.calls[1] as [string, unknown[]];
    expect(sql).toMatch(/empleador ILIKE \$1/);
    expect(sql).not.toMatch(/tsvector/);
    expect(valores[0]).toBe('%Sky Airline%');
  });

  it('descarta la candidata que ya es la exacta, y las que quedan bajo el umbral', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ id: 9, titulo: 'Desarrollador', empleador: 'Sky Airline' }] }); // exacta
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 9, titulo: 'Desarrollador', empleador: 'Sky Airline', fecha_creacion: '2026-01-01' },
        { id: 10, titulo: 'Desarrollador', empleador: 'Sky Airline', fecha_creacion: '2026-01-02' },
        { id: 11, titulo: 'Cajero', empleador: 'Otra Empresa', fecha_creacion: '2026-01-03' },
      ],
    });

    const r = await buscarPegasSimilares({ titulo: 'Desarrollador', empleador: 'Sky Airline', url: 'https://x.cl' });

    expect(r.exacta?.id).toBe(9);
    const ids = r.similares.map(s => s.id);
    expect(ids).not.toContain(9);
    expect(ids).toContain(10);
    expect(ids).not.toContain(11);
  });

  it('ordena las similares de mayor a menor puntaje', async () => {
    // Sin url no hay lookup de exacta (ver el test "sin url..." de arriba):
    // esta es la única llamada a `query`.
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 1, titulo: 'Desarrollador Backend Pleno', empleador: 'Sky Airline' },
        { id: 2, titulo: 'Desarrollador Backend', empleador: 'Sky Airline' },
      ],
    });

    const r = await buscarPegasSimilares({ titulo: 'Desarrollador Backend', empleador: 'Sky Airline', url: '' });
    expect(r.similares[0]?.id).toBe(2);
  });
});
