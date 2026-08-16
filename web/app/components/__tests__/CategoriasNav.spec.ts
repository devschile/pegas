import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CategoriasNav from '../CategoriasNav.vue';

describe('CategoriasNav', () => {
  it('renderiza un link "Todos" hacia el inicio, seguido de un link por categoria', () => {
    const wrapper = mount(CategoriasNav, { props: { categories: ['Frontend', 'Full Stack'] } });

    const links = wrapper.findAllComponents({ name: 'NuxtLink' });
    expect(links.map(link => link.props('to'))).toEqual(['/', '/categoria/frontend', '/categoria/full-stack']);
  });

  it('marca "Todos" siempre como positive, activa o no una categoria', () => {
    const wrapper = mount(CategoriasNav, {
      props: { categories: ['Frontend', 'Backend'], active: 'Backend' },
    });

    const badges = wrapper.findAllComponents({ name: 'ChBadge' });
    expect(badges[0]!.text()).toBe('Todos');
    expect(badges[0]!.props('variant')).toBe('positive');
  });

  it('marca como positive el badge de la categoria activa', () => {
    const wrapper = mount(CategoriasNav, {
      props: { categories: ['Frontend', 'Backend'], active: 'Backend' },
    });

    const badges = wrapper.findAllComponents({ name: 'ChBadge' });
    expect(badges[1]!.props('variant')).toBe('default');
    expect(badges[2]!.props('variant')).toBe('positive');
  });

  it('emite reset al hacer click en "Todos"', async () => {
    const wrapper = mount(CategoriasNav, { props: { categories: ['Frontend'] } });

    await wrapper.findAllComponents({ name: 'NuxtLink' })[0]!.trigger('click');

    expect(wrapper.emitted('reset')).toHaveLength(1);
  });
});
