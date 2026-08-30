<script setup lang="ts">
import { IconBriefcase } from '@tabler/icons-vue';
import { computed } from 'vue';
import type { PegasMeta } from '~/types/pega';

const { data } = useFetch<PegasMeta>('/api/meta', { key: 'pegas-meta' });
const total = computed(() => data.value?.total ?? 0);
</script>

<template>
  <header class="site-header">
    <h1 class="site-header__title">💵 <span>Pegas</span> devsChile()</h1>
    <p class="site-header__subtitle">{{ total }} ofertas de trabajo tech desde varias fuentes</p>
  </header>
</template>

<style scoped>
.site-header {
  text-align: center;
  padding: 3rem 1.5rem 1.5rem;
}

.site-header__title {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0;
  font-size: 2.4rem;
  letter-spacing: -1px;
  font-kerning: 700;
}

.site-header__title span {
  color: var(--accent, #2dd4bf);
}

.site-header__subtitle {
  margin: 0.75rem 0 0;
  color: var(--text-muted, #666);
}
</style>
