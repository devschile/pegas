import { describe, expect, it } from 'vitest';
import { categorySlug, findCategoryBySlug, idFromSlug, jobSlug, slugify } from '../slug';

describe('slugify', () => {
  it('pasa a minusculas y reemplaza espacios por guiones', () => {
    expect(slugify('Frontend Developer')).toBe('frontend-developer');
  });

  it('quita tildes', () => {
    expect(slugify('Diseñador UX en Ingeniería')).toBe('disenador-ux-en-ingenieria');
  });

  it('colapsa simbolos y espacios repetidos en un solo guion', () => {
    expect(slugify('Full  Stack / DevOps!!')).toBe('full-stack-devops');
  });

  it('no deja guiones al inicio ni al final', () => {
    expect(slugify('  Full Stack  ')).toBe('full-stack');
  });
});

describe('jobSlug / idFromSlug', () => {
  const job = { id: 123, titulo: 'Frontend Developer', empleador: 'Acme' };

  it('arma el slug con el id primero', () => {
    expect(jobSlug(job)).toBe('123-frontend-developer-acme');
  });

  it('idFromSlug recupera el id numerico', () => {
    expect(idFromSlug(jobSlug(job))).toBe(123);
  });

  it('idFromSlug devuelve null si no empieza con numero', () => {
    expect(idFromSlug('frontend-developer')).toBeNull();
  });
});

describe('categorySlug', () => {
  it('normaliza categorias con tildes y espacios', () => {
    expect(categorySlug('Gestión')).toBe('gestion');
    expect(categorySlug('Full Stack')).toBe('full-stack');
  });
});

describe('findCategoryBySlug', () => {
  const categories = ['Frontend', 'Full Stack', 'Gestión'];

  it('recupera la categoria real (con tildes/mayusculas) a partir del slug', () => {
    expect(findCategoryBySlug(categories, 'full-stack')).toBe('Full Stack');
    expect(findCategoryBySlug(categories, 'gestion')).toBe('Gestión');
  });

  it('devuelve null si ninguna categoria matchea', () => {
    expect(findCategoryBySlug(categories, 'no-existe')).toBeNull();
  });
});
