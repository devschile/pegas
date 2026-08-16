import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach } from 'vitest';

/**
 * Sin esto, los wrappers montados con mount() en un test siguen vivos
 * (efectos reactivos, watchers) cuando corre el siguiente test del mismo
 * archivo — causaba renders fantasma de un test anterior filtrándose en
 * las aserciones de otro (visto en las páginas que usan useJobsListing,
 * que registra un watch() interno).
 */
enableAutoUnmount(afterEach);
