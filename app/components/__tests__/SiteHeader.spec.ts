import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SiteHeader from '../SiteHeader.vue';

const { useFetchMock } = vi.hoisted(() => ({
  useFetchMock: vi.fn(),
}));
mockNuxtImport('useFetch', () => useFetchMock);

describe('SiteHeader', () => {
  it('muestra el nombre del sitio, el subtitulo y el total de pegas', () => {
    useFetchMock.mockReturnValue({ data: ref({ total: 743 }) });

    const wrapper = mount(SiteHeader);

    expect(wrapper.text()).toContain('Pegas devsChile()');
    expect(wrapper.text()).toContain('743 ofertas de trabajo tech desde varias fuentes');
    const [url, options] = useFetchMock.mock.calls[0]!;
    expect(url).toBe('/api/meta');
    expect(options).toMatchObject({ key: 'pegas-meta' });
  });

  it('muestra 0 mientras no hay datos', () => {
    useFetchMock.mockReturnValue({ data: ref(null) });

    const wrapper = mount(SiteHeader);

    expect(wrapper.text()).toContain('0 ofertas de trabajo tech desde varias fuentes');
  });
});
