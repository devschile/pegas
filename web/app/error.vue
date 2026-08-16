<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import type { NuxtError } from '#app';

const props = defineProps<{ error: NuxtError }>();

const isNotFound = props.error.statusCode === 404;

useSeoMeta({
  title: isNotFound ? 'Página no encontrada' : 'Ocurrió un error',
  robots: 'noindex',
});

function goToHome() {
  clearError({ redirect: '/' });
}
</script>

<template>
  <div class="app-shell">
    <SiteHeader />
    <main class="error-page">
      <h1 class="error-page__codigo">{{ error.statusCode }}</h1>
      <p class="error-page__mensaje">
        {{ isNotFound ? 'Esta pega ya no está, o la URL está mala.' : (error.statusMessage || 'Algo salió mal.') }}
      </p>
      <ChButton variant="primary" @ch-click="goToHome">Volver al inicio</ChButton>
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.error-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  text-align: center;
}

.error-page__codigo {
  font-size: 4rem;
  margin: 0;
  color: var(--accent, #2dd4bf);
}

.error-page__mensaje {
  margin: 1rem 0 2rem;
  color: var(--text-muted, #666);
}
</style>
