<script setup lang="ts">
import { ChLink } from '@devschile/chucao/vue';
import { computed } from 'vue';
import { sourceLabel } from '~/utils/pegas';
import type { PegasMeta } from '~/types/pega';

/**
 * Misma `key` que `SiteHeader`: Nuxt deduplica por clave, así que esto no es
 * un segundo request.
 *
 * La lista de fuentes sale de la API y no escrita a mano porque escrita a mano
 * ya se desfasó: decía "LinkedIn, WorkingNomads, GetOnBoard y otras fuentes"
 * cuando el pipeline llevaba rato trayendo seis. Un aviso que nombra mal de
 * dónde salen los datos es peor que no nombrarlas.
 */
const { data } = useFetch<PegasMeta>('/api/meta', { key: 'pegas-meta' });
const fuentes = computed(() => (data.value?.fuentes ?? []).map(sourceLabel).join(', '));
</script>

<template>
  <footer class="site-footer">
    <nav class="site-footer__enlaces">
      <ChLink href="https://devschile.cl">devsChile</ChLink>
      <span class="site-footer__separator">·</span>
      <ChLink href="https://github.com/devschile/pegas">GitHub</ChLink>
      <span class="site-footer__separator">·</span>
      <ChLink href="https://empresas.devschile.cl/pegas-devschile">Quiero auspiciar en pegas</ChLink>
    </nav>

    <p class="site-footer__aviso">
      Los avisos vienen de fuentes públicas<span v-if="fuentes"> ({{ fuentes }})</span> y siempre
      enlazan a la publicación original: postular ocurre en el sitio de origen, no acá.
      Si publicaste una oferta y prefieres que no aparezca,
      escribe a <ChLink href="mailto:huemul@devschile.cl">huemul@devschile.cl</ChLink> y la quitamos.
    </p>
  </footer>
</template>

<style scoped>
.site-footer {
  text-align: center;
  padding: 2.5rem 1.5rem 3rem;
  color: var(--text-muted, #666);
  font-size: 0.7rem;
}

.site-footer__separator {
  margin: 0 0.5rem;
}

/* Un párrafo aparte y no otro elemento de la fila: es un aviso, no
   navegación, y en la fila obligaría a cortarla en varias líneas. */
.site-footer__aviso {
  max-width: 54ch;
  margin: 1rem auto 0;
  line-height: 1.6;
  text-wrap: pretty;
}
</style>
