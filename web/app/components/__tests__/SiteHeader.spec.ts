import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SiteHeader from '../SiteHeader.vue';

const { useJobsMock } = vi.hoisted(() => ({
  useJobsMock: vi.fn(),
}));
mockNuxtImport('useJobs', () => useJobsMock);

describe('SiteHeader', () => {
  it('muestra el nombre del sitio, el subtitulo y el total de pegas', () => {
    useJobsMock.mockReturnValue({ data: ref({ total: 743 }) });

    const wrapper = mount(SiteHeader);

    expect(wrapper.text()).toContain('Pegas devsChile()');
    expect(wrapper.text()).toContain('743 ofertas de trabajo tech desde varias fuentes');
  });

  it('muestra 0 mientras no hay datos', () => {
    useJobsMock.mockReturnValue({ data: ref(null) });

    const wrapper = mount(SiteHeader);

    expect(wrapper.text()).toContain('0 ofertas de trabajo tech desde varias fuentes');
  });
});
