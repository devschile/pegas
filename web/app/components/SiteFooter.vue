<script setup lang="ts">
import { ChLink } from '@devschile/chucao/vue';
</script>

<template>
  <footer class="site-footer">
    <ChLink href="https://devschile.cl" data-allow-mismatch="class">devsChile</ChLink>
    <span class="site-footer__separator">·</span>
    <ChLink href="https://github.com/devschile/pegas" data-allow-mismatch="class">GitHub</ChLink>
    <span class="site-footer__separator">·</span>
    <span>Datos públicos desde LinkedIn, WorkingNomads, GetOnBoard y otras fuentes.</span>
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
</style>
