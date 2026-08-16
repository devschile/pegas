import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SiteFooter from '../SiteFooter.vue';

describe('SiteFooter', () => {
  it('enlaza a devsChile y a GitHub', () => {
    const wrapper = mount(SiteFooter);

    const links = wrapper.findAllComponents({ name: 'ChLink' });
    const hrefs = links.map(l => l.props('href'));

    expect(hrefs).toContain('https://devschile.cl');
    expect(hrefs).toContain('https://github.com/devschile/pegas');
  });
});
