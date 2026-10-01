import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import SiteFooter from '../SiteFooter.vue';

const { useFetchMock } = vi.hoisted(() => ({ useFetchMock: vi.fn() }));
mockNuxtImport('useFetch', () => useFetchMock);

function montar(fuentes: string[] | null = null) {
  useFetchMock.mockReturnValue({ data: ref(fuentes ? { fuentes } : null) });
  return mount(SiteFooter);
}

const hrefs = (wrapper: ReturnType<typeof montar>) =>
  wrapper.findAllComponents({ name: 'ChLink' }).map(l => l.props('href'));

beforeEach(() => {
  useFetchMock.mockReset();
});

describe('SiteFooter', () => {
  it('enlaza a devsChile y a GitHub', () => {
    const h = hrefs(montar());

    expect(h).toContain('https://devschile.cl');
    expect(h).toContain('https://github.com/devschile/pegas');
  });

  /**
   * Las tres cosas que el aviso tiene que dejar claras: de dónde salen los
   * datos, que acá no se postula, y a quién escribirle para que se saque.
   */
  it('dice que las fuentes son públicas y que la postulación ocurre en el origen', () => {
    const texto = montar().text();

    expect(texto).toContain('fuentes públicas');
    expect(texto).toContain('publicación original');
    expect(texto).toContain('sitio de origen');
  });

  it('ofrece el correo para pedir que se quite un aviso', () => {
    const wrapper = montar();

    expect(hrefs(wrapper)).toContain('mailto:huemul@devschile.cl');
    expect(wrapper.text()).toContain('la quitamos');
  });

  /**
   * La lista escrita a mano ya se desfasó una vez: nombraba tres fuentes
   * cuando el pipeline traía seis. Sale de la API justamente por eso.
   */
  it('nombra las fuentes que informa la API, con su nombre bonito', () => {
    const texto = montar(['getonbrd', 'takealuk', 'linkedin']).text();

    expect(texto).toContain('GetOnBoard');
    expect(texto).toContain('Luk');
    expect(texto).toContain('LinkedIn');
    expect(texto).not.toContain('takealuk');
  });

  it('no deja un paréntesis vacío si la API todavía no respondió', () => {
    expect(montar().text()).not.toMatch(/\(\s*\)/);
  });
});
