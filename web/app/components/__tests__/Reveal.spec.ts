import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Reveal from '../Reveal.vue';

describe('Reveal', () => {
  it('renderiza el contenido del slot', () => {
    const wrapper = mount(Reveal, {
      slots: { default: '<p>contenido</p>' },
    });

    expect(wrapper.html()).toContain('contenido');
  });

  it('acepta props de animacion personalizados sin romper el render', () => {
    const wrapper = mount(Reveal, {
      props: { delay: 0.5, y: 0, duration: 1 },
      slots: { default: '<p>contenido</p>' },
    });

    expect(wrapper.html()).toContain('contenido');
  });
});
