import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import Skeleton from '../Skeleton.vue';

describe('Skeleton', () => {
  it('usa dimensiones por defecto', () => {
    const wrapper = mount(Skeleton);

    expect(wrapper.attributes('style')).toContain('width: 100%');
    expect(wrapper.attributes('style')).toContain('height: 1em');
  });

  it('acepta ancho/alto/radio personalizados', () => {
    const wrapper = mount(Skeleton, { props: { width: '50px', height: '2rem', radius: '999px' } });

    expect(wrapper.attributes('style')).toContain('width: 50px');
    expect(wrapper.attributes('style')).toContain('height: 2rem');
    expect(wrapper.attributes('style')).toContain('border-radius: 999px');
  });

  it('es decorativo (aria-hidden) para no ensuciar el accessibility tree', () => {
    const wrapper = mount(Skeleton);

    expect(wrapper.attributes('aria-hidden')).toBe('true');
  });
});
