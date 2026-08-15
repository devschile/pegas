<script setup lang="ts">
const { data, status, error } = await usePegas();
</script>

<template>
  <main class="listado">
    <h1>Pegas devsChile</h1>

    <p v-if="status === 'pending'">Cargando pegas...</p>
    <p v-else-if="error">No se pudieron cargar las pegas. Intenta de nuevo mas tarde.</p>
    <p v-else-if="!data?.pegas.length">No hay pegas disponibles por ahora.</p>

    <div v-else class="listado__grid">
      <PegaCard v-for="pega in data.pegas" :key="pega.id" :pega="pega" />
    </div>
  </main>
</template>

<style scoped>
.listado__grid {
  display: grid;
  gap: var(--spacing-md, 1rem);
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
</style>
