import { describe, expect, it } from 'vitest';
import { nextTick, ref } from 'vue';
import { PAGE_SIZE, useJobsListing } from '../useJobsListing';
import type { Pega } from '~/types/pega';

function buildJob(overrides: Partial<Pega>): Pega {
  return {
    id: 1,
    url: 'https://example.com/1',
    titulo: 'Frontend Developer',
    empleador: 'Acme',
    descripcion: 'Frontend Developer, Chile',
    categoria: 'Frontend',
    ubicacion: 'Chile',
    sueldo: null,
    tags: null,
    fecha_publicacion: '2026-08-15T00:00:00.000Z',
    fuente: 'getonbrd',
    fecha_creacion: '2026-08-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('useJobsListing', () => {
  it('sin filtros muestra todo, hasta PAGE_SIZE por pagina', () => {
    const jobs = ref(Array.from({ length: 30 }, (_, i) => buildJob({ id: i, titulo: `Pega ${i}` })));
    const { filteredJobs, pageItems, totalPages } = useJobsListing(jobs);

    expect(filteredJobs.value).toHaveLength(30);
    expect(pageItems.value).toHaveLength(PAGE_SIZE);
    expect(totalPages.value).toBe(2);
  });

  it('filtra por categoria', () => {
    const jobs = ref([
      buildJob({ id: 1, categoria: 'Frontend' }),
      buildJob({ id: 2, categoria: 'Backend' }),
    ]);
    const { filteredJobs, category } = useJobsListing(jobs);

    category.value = 'Backend';

    expect(filteredJobs.value).toHaveLength(1);
    expect(filteredJobs.value[0]!.id).toBe(2);
  });

  it('filtra por fuente', () => {
    const jobs = ref([
      buildJob({ id: 1, fuente: 'getonbrd' }),
      buildJob({ id: 2, fuente: 'linkedin' }),
    ]);
    const { filteredJobs, source } = useJobsListing(jobs);

    source.value = 'linkedin';

    expect(filteredJobs.value).toHaveLength(1);
    expect(filteredJobs.value[0]!.id).toBe(2);
  });

  it('busca por titulo, empleador, descripcion y categoria (case-insensitive)', () => {
    const jobs = ref([
      buildJob({ id: 1, titulo: 'Backend Developer', empleador: 'Acme' }),
      buildJob({ id: 2, titulo: 'Diseñador UX', empleador: 'Otra Empresa' }),
    ]);
    const { filteredJobs, query } = useJobsListing(jobs);

    query.value = 'ACME';

    expect(filteredJobs.value).toHaveLength(1);
    expect(filteredJobs.value[0]!.id).toBe(1);
  });

  it('vuelve a la pagina 1 cuando cambia un filtro', async () => {
    const jobs = ref(Array.from({ length: 30 }, (_, i) => buildJob({ id: i })));
    const { page, nextPage, query } = useJobsListing(jobs);

    nextPage();
    expect(page.value).toBe(2);

    query.value = 'algo';
    await nextTick();

    expect(page.value).toBe(1);
  });

  it('nextPage/prevPage no salen del rango [1, totalPages]', () => {
    const jobs = ref([buildJob({ id: 1 })]);
    const { page, nextPage, prevPage, totalPages } = useJobsListing(jobs);

    expect(totalPages.value).toBe(1);
    nextPage();
    expect(page.value).toBe(1);

    prevPage();
    expect(page.value).toBe(1);
  });
});
