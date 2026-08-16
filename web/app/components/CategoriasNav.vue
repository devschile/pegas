<script setup lang="ts">
import { ChBadge } from '@devschile/chucao/vue';
import { categorySlug } from '~/utils/slug';

defineProps<{ categories: string[]; active?: string }>();
const emit = defineEmits<{ reset: [] }>();
</script>

<template>
  <div class="categorias-nav-wrap">
    <h2 class="categorias-nav__title">Categorías</h2>
    <nav class="categorias-nav" aria-label="Categorías">
      <NuxtLink to="/" class="categorias-nav__link categorias-nav__todos" @click="emit('reset')">
        <ChBadge variant="positive">Todos</ChBadge>
      </NuxtLink>
      <NuxtLink
        v-for="category in categories"
        :key="category"
        :to="`/categoria/${categorySlug(category)}`"
        class="categorias-nav__link"
      >
        <ChBadge :variant="category === active ? 'positive' : 'default'">{{ category }}</ChBadge>
      </NuxtLink>
    </nav>
  </div>
</template>

<style scoped>
.categorias-nav-wrap {
  margin-bottom: 2rem;
}

.categorias-nav__title {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.categorias-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  --typography-size-xs: var(--typography-size-sm);
}

.categorias-nav__link {
  text-decoration: none;
}

.categorias-nav__todos {
  --color-status-positive: #fb923c;
  --color-status-positive-background: rgba(251, 146, 60, 0.18);
}
</style>
