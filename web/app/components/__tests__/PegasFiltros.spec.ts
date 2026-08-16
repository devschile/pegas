import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PegasFiltros from '../PegasFiltros.vue';

function mountFilters(props: Partial<InstanceType<typeof PegasFiltros>['$props']> = {}) {
  return mount(PegasFiltros, {
    props: {
      sources: ['getonbrd', 'linkedin'],
      totalVisible: 2,
      totalGeneral: 10,
      query: '',
      source: '',
      ...props,
    },
  });
}

describe('PegasFiltros', () => {
  it('muestra el conteo de visibles/total', () => {
    const wrapper = mountFilters();

    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('10');
  });

  it('muestra solo el select de fuente', () => {
    const wrapper = mountFilters();

    expect(wrapper.findAllComponents({ name: 'ChSelect' })).toHaveLength(1);
  });

  it('emite update:query al escribir en el buscador', async () => {
    const wrapper = mountFilters();
    const input = wrapper.findComponent({ name: 'ChInput' });

    await input.vm.$emit('ch-input', { detail: 'react' });

    expect(wrapper.emitted('update:query')).toEqual([['react']]);
  });

  it('emite update:source al cambiar el select de fuente', async () => {
    const wrapper = mountFilters();
    const sourceSelect = wrapper.findComponent({ name: 'ChSelect' });

    await sourceSelect.vm.$emit('ch-change', { detail: 'linkedin' });

    expect(wrapper.emitted('update:source')).toEqual([['linkedin']]);
  });
});
