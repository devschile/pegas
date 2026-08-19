import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import PegasFiltros from '../PegasFiltros.vue';

/** Salta directo al valor final en vez de animar 0.5s -- solo interesa que se dispare, no el timing real. */
vi.mock('motion-v', async importOriginal => {
  const actual = await importOriginal<typeof import('motion-v')>();
  return {
    ...actual,
    animate: (value: { set: (v: number) => void }, target: number) => {
      value.set(target);
      return { stop: vi.fn() };
    },
  };
});

function mountFilters(props: Partial<InstanceType<typeof PegasFiltros>['$props']> = {}) {
  return mount(PegasFiltros, {
    props: {
      sources: ['getonbrd', 'linkedin'],
      totalVisible: 2,
      totalGeneral: 10,
      query: '',
      source: '',
      ...props,
    },
  });
}

describe('PegasFiltros', () => {
  it('muestra el conteo de visibles/total', () => {
    const wrapper = mountFilters();

    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('10');
  });

  it('anima el conteo (sin saltar de golpe) cuando cambian los totales', async () => {
    const wrapper = mountFilters({ totalVisible: 2, totalGeneral: 10 });

    await wrapper.setProps({ totalVisible: 5, totalGeneral: 20 });
    await nextTick();

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('5');
      expect(wrapper.text()).toContain('20');
    });
  });

  it('muestra solo el select de fuente', () => {
    const wrapper = mountFilters();

    expect(wrapper.findAllComponents({ name: 'ChSelect' })).toHaveLength(1);
  });

  it('emite update:query al escribir en el buscador', async () => {
    const wrapper = mountFilters();
    const input = wrapper.findComponent({ name: 'ChInput' });

    await input.vm.$emit('ch-input', { detail: 'react' });

    expect(wrapper.emitted('update:query')).toEqual([['react']]);
  });

  it('emite update:source al cambiar el select de fuente', async () => {
    const wrapper = mountFilters();
    const sourceSelect = wrapper.findComponent({ name: 'ChSelect' });

    await sourceSelect.vm.$emit('ch-change', { detail: 'linkedin' });

    expect(wrapper.emitted('update:source')).toEqual([['linkedin']]);
  });
});
