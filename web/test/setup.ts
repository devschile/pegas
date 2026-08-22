import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';

/**
 * Sin esto, los wrappers montados con mount() en un test siguen vivos
 * (efectos reactivos, watchers) cuando corre el siguiente test del mismo
 * archivo — causaba renders fantasma de un test anterior filtrándose en
 * las aserciones de otro (visto en las páginas que usan useJobsListing,
 * que registra un watch() interno).
 */
enableAutoUnmount(afterEach);

/**
 * mockNuxtImport() no sirve aca: falla en tiempo de transform porque
 * defineOgImage viene de nuxt-og-image, un modulo que el entorno de test no
 * activa (no hay analisis estatico de un import que "no existe" para el
 * harness). Como stub global sí funciona -- es justamente asi como Nuxt lo
 * expone en runtime, como global sin import.
 */
vi.stubGlobal('defineOgImage', vi.fn());
