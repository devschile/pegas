<template>
  <div class="app-shell">
    <NuxtRouteAnnouncer />
    <SiteHeader />
    <main class="app-shell__main">
      <NuxtPage>
        <template #default="{ Component, route }">
          <AnimatePresence mode="wait">
            <Motion
              :key="route.fullPath"
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
    </main>
    <SiteFooter />
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
