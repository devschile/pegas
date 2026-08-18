import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ReactionIcon from '../ReactionIcon.vue';

describe('ReactionIcon', () => {
  it('renderiza sin explotar (variant like, inactivo)', () => {
    const wrapper = mount(ReactionIcon, { props: { variant: 'like', active: false } });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it('renderiza activo', () => {
    const wrapper = mount(ReactionIcon, { props: { variant: 'save', active: true } });
    expect(wrapper.find('svg').exists()).toBe(true);
  });
});
