<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <SiteHeader />
    <main class="app-shell__main">
      <!--
        NuxtLayout envuelve NuxtPage: el layout (ej. app/layouts/listado.vue,
        con la barra de filtros) es persistente entre paginas que lo
        comparten -- Nuxt solo lo remonta cuando el layout en si cambia
        (definePageMeta({ layout })), no en cada navegacion de pagina. Asi
        index.vue <-> categoria/[categoria].vue no se remontan mas y la
        barra de filtros/contador animado sobreviven ese cambio.
      -->
      <NuxtLayout>
        <NuxtPage>
          <template #default="{ Component, route }">
            <!--
              key="route.path", no "route.fullPath": el query string cambia en
              cada filtro/pagina (useJobsListing hace router.replace), y con
              fullPath como key la pagina entera se destruia y recreaba en
              cada cambio de filtro (mostrando el skeleton de #fallback de
              vuelta) en vez de solo re-fetchear en el lugar -- rompia
              cualquier transicion mas fina (fade del bloque de resultados,
              contador animado de PegasFiltros) porque los componentes nunca
              llegaban a actualizarse, siempre nacian de cero.
            -->
            <AnimatePresence mode="wait">
              <Motion
                :key="route.path"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :exit="{ opacity: 0 }"
                :transition="{ duration: 0.2, ease: 'easeOut' }"
              >
                <component :is="Component" />
              </Motion>
            </AnimatePresence>
          </template>
          <template #fallback>
            <PegasSkeleton />
          </template>
        </NuxtPage>
      </NuxtLayout>
    </main>
    <SiteFooter />
    <UserMenu />
  </div>
</template>

<style scoped>
.app-shell__main {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}

@media (min-width: 768px) {
  .app-shell__main {
    padding: 0.5rem 2rem 5rem;
  }
}
</style>
