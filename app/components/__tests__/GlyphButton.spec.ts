import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import GlyphButton from '../GlyphButton.vue';

describe('GlyphButton', () => {
  it('con href es un enlace; sin href, un botón', () => {
    expect(mount(GlyphButton, { props: { href: 'mailto:a@b.cl' } }).element.tagName).toBe('A');
    const boton = mount(GlyphButton);
    expect(boton.element.tagName).toBe('BUTTON');
    expect(boton.attributes('type')).toBe('button');
  });

  it('renderiza las doce columnas del relleno', () => {
    expect(mount(GlyphButton).findAll('.glyph-btn__fill > span')).toHaveLength(12);
  });

  it('escalona el retardo para que el barrido corra de izquierda a derecha', () => {
    const columnas = mount(GlyphButton).findAll('.glyph-btn__fill > span');
    expect(columnas[0]!.attributes('style')).toContain('0ms');
    expect(columnas[11]!.attributes('style')).toContain('198ms');
  });

  it('el relleno es decorativo y no lo anuncia un lector de pantalla', () => {
    expect(mount(GlyphButton).find('.glyph-btn__fill').attributes('aria-hidden')).toBe('true');
  });

  it('el contenido va en la etiqueta, por encima del relleno', () => {
    const w = mount(GlyphButton, { slots: { default: 'Hablemos' } });
    expect(w.find('.glyph-btn__label').text()).toBe('Hablemos');
  });

  it('la variante sutil no usa el acento', () => {
    expect(mount(GlyphButton, { props: { variant: 'sutil' } }).classes()).toContain('glyph-btn--sutil');
    expect(mount(GlyphButton).classes()).toContain('glyph-btn--acento');
  });
});
