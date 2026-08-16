import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PegaCardSkeleton from '../PegaCardSkeleton.vue';

describe('PegaCardSkeleton', () => {
  it('renderiza varias barras placeholder', () => {
    const wrapper = mount(PegaCardSkeleton);

    expect(wrapper.findAllComponents({ name: 'Skeleton' }).length).toBeGreaterThan(1);
  });
});
