import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ErrorPage from '../error.vue';

describe('error.vue', () => {
  it('muestra mensaje especifico para 404', () => {
    const wrapper = mount(ErrorPage, {
      props: { error: { statusCode: 404, statusMessage: 'Not Found' } },
    });

    expect(wrapper.text()).toContain('404');
    expect(wrapper.text()).toContain('ya no está');
  });

  it('muestra el statusMessage para otros codigos', () => {
    const wrapper = mount(ErrorPage, {
      props: { error: { statusCode: 500, statusMessage: 'Fallo interno' } },
    });

    expect(wrapper.text()).toContain('500');
    expect(wrapper.text()).toContain('Fallo interno');
  });

  it('muestra un boton para volver al inicio', () => {
    const wrapper = mount(ErrorPage, {
      props: { error: { statusCode: 404, statusMessage: 'Not Found' } },
    });

    expect(wrapper.findComponent({ name: 'ChButton' }).exists()).toBe(true);
  });
});
