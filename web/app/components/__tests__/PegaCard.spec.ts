import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import PegaCard from '../PegaCard.vue';
import type { Pega } from '~/types/pega';

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
mockNuxtImport('useTrackEvent', () => () => trackMock);

const baseJob: Pega = {
  id: 1,
  url: 'https://example.com/pega/1',
  titulo: 'Frontend Developer',
  empleador: 'Acme',
  descripcion: 'Frontend Developer, Chile',
  categoria: 'Frontend',
  ubicacion: 'Chile',
  sueldo: null,
  tags: 'remote',
  fecha_publicacion: '2026-08-15T00:00:00.000Z',
  fuente: 'getonbrd',
  fecha_creacion: '2026-08-15T00:00:00.000Z',
};

describe('PegaCard', () => {
  it('muestra el titulo, el empleador y la ubicacion', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(wrapper.text()).toContain('Frontend Developer');
    expect(wrapper.text()).toContain('Acme');
    expect(wrapper.text()).toContain('Chile');
  });

  it('no muestra badge de sueldo cuando no hay sueldo', () => {
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    expect(wrapper.text()).not.toContain('USD');
  });

  it('muestra el sueldo cuando esta presente', () => {
    const job = { ...baseJob, sueldo: 'USD 2000 - 3000 /mes' };
    const wrapper = mount(PegaCard, { props: { job } });

    expect(wrapper.text()).toContain('USD 2000 - 3000 /mes');
  });

  it('al hacer click en "Ver oferta" abre el aviso original y trackea el evento', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    trackMock.mockClear();
    const wrapper = mount(PegaCard, { props: { job: baseJob } });

    await wrapper.findComponent({ name: 'ChButton' }).vm.$emit('ch-click');

    expect(openSpy).toHaveBeenCalledWith(baseJob.url, '_blank', 'noopener,noreferrer');
    expect(trackMock).toHaveBeenCalledWith(
      'pega_click_apply',
      expect.objectContaining({ pega_id: baseJob.id, empleador: baseJob.empleador }),
    );

    openSpy.mockRestore();
  });
});
