import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PegasSkeleton from '../PegasSkeleton.vue';

describe('PegasSkeleton', () => {
  it('renderiza 9 cards placeholder por defecto', () => {
    const wrapper = mount(PegasSkeleton);

    expect(wrapper.findAllComponents({ name: 'PegaCardSkeleton' })).toHaveLength(9);
  });

  it('respeta un count personalizado', () => {
    const wrapper = mount(PegasSkeleton, { props: { count: 3 } });

    expect(wrapper.findAllComponents({ name: 'PegaCardSkeleton' })).toHaveLength(3);
  });

  it('usa la misma clase de grid que el listado real (pegas-grid)', () => {
    const wrapper = mount(PegasSkeleton, { props: { count: 1 } });

    expect(wrapper.classes()).toContain('pegas-grid');
  });

  it('marca aria-busy para lectores de pantalla', () => {
    const wrapper = mount(PegasSkeleton, { props: { count: 1 } });

    expect(wrapper.attributes('aria-busy')).toBe('true');
  });
});
