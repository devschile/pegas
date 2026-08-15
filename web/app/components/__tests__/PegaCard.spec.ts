import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PegaCard from '../PegaCard.vue';
import type { Pega } from '~/types/pega';

const basePega: Pega = {
  id: 1,
  url: 'https://example.com/pega/1',
  titulo: 'Frontend Developer',
  empleador: 'Acme',
  descripcion: 'Frontend Developer, Chile',
  categoria: 'Frontend',
  ubicacion: 'Chile',
  sueldo: null,
  tags: 'remote',
  fecha_publicacion: '2026-08-15T00:00:00.000Z',
  fuente: 'getonbrd',
  fecha_creacion: '2026-08-15T00:00:00.000Z',
};

describe('PegaCard', () => {
  it('muestra el titulo, el empleador y la ubicacion', () => {
    const wrapper = mount(PegaCard, { props: { pega: basePega } });

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Chile');
  });

  it('no muestra badge de sueldo cuando no hay sueldo', () => {
    const wrapper = mount(PegaCard, { props: { pega: basePega } });

    expect(wrapper.text()).not.toContain('USD');
  });

  it('muestra el sueldo cuando esta presente', () => {
    const pega = { ...basePega, sueldo: 'USD 2000 - 3000 /mes' };
    const wrapper = mount(PegaCard, { props: { pega } });

    expect(wrapper.text()).toContain('USD 2000 - 3000 /mes');
  });

  it('enlaza al aviso original', () => {
    const wrapper = mount(PegaCard, { props: { pega: basePega } });

    const link = wrapper.findComponent({ name: 'ChLink' });
    expect(link.props('href')).toBe(basePega.url);
  });
});
