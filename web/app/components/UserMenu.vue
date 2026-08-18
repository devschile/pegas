<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
import { IconBrandGithub, IconBrandSlack, IconLogout, IconUserCircle } from '@tabler/icons-vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';

interface Me {
  id: number;
  nombre: string | null;
  avatarUrl: string | null;
}

const { loggedIn, clear } = useUserSession();
const { data: me, refresh: refreshMe } = await useFetch<Me>('/api/me', {
  key: 'me',
  immediate: loggedIn.value,
});

watch(loggedIn, isLoggedIn => {
  if (isLoggedIn) refreshMe();
  else me.value = null;
});

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function toggle() {
  open.value = !open.value;
}

/** Cierra el popover al clickear afuera -- no hay VueUse en este proyecto. */
function handleDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleDocumentClick));
onUnmounted(() => document.removeEventListener('click', handleDocumentClick));

async function handleLogoutClick() {
  await clear();
  open.value = false;
}
</script>

<template>
  <div ref="root" class="user-menu">
    <button class="user-menu__trigger" type="button" aria-label="Cuenta" @click="toggle">
      <img v-if="loggedIn && me?.avatarUrl" :src="me.avatarUrl" alt="" class="user-menu__avatar" />
      <IconUserCircle v-else :size="28" aria-hidden="true" />
    </button>

    <Transition name="user-menu-panel">
      <div v-if="open" class="user-menu__panel">
        <template v-if="loggedIn">
          <NuxtLink to="/mis-pegas" class="user-menu__link" @click="open = false">Mis pegas</NuxtLink>
          <ChButton variant="secondary" @ch-click="handleLogoutClick">
            <IconLogout :size="16" aria-hidden="true" /> Cerrar sesión
          </ChButton>
        </template>
        <template v-else>
          <span class="user-menu__panel-title">Login:</span>
          <div class="user-menu__providers">
            <a class="user-menu__provider" href="/auth/github" title="Entrar con GitHub" aria-label="Entrar con GitHub">
              <IconBrandGithub :size="20" aria-hidden="true" />
            </a>
            <a class="user-menu__provider" href="/auth/slack" title="Entrar con Slack" aria-label="Entrar con Slack">
              <IconBrandSlack :size="20" aria-hidden="true" />
            </a>
          </div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-menu {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 100;
}

.user-menu__trigger {
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 50%;
  border: 2px solid #fdba74;
  background: #fb923c;
  color: #1a1005;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(251, 146, 60, 0.5);
  overflow: hidden;
  padding: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.user-menu__trigger:hover {
  background: #fdba74;
  box-shadow: 0 4px 20px rgba(251, 146, 60, 0.7);
}

.user-menu__trigger:active {
  transform: scale(0.92);
}

.user-menu__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu__panel {
  position: absolute;
  bottom: calc(100% + 0.75rem);
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background: var(--surface, #1a1f2e);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  min-width: 10rem;
}

.user-menu__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: inherit;
  text-decoration: none;
}

.user-menu__link:hover {
  color: var(--accent, #2dd4bf);
}

.user-menu__panel-title {
  font-size: 0.85em;
  color: var(--text-muted, #666);
}

.user-menu__providers {
  display: flex;
  gap: 0.6rem;
}

.user-menu__provider {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  border: 1px solid var(--border, rgba(255, 255, 255, 0.15));
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.user-menu__provider:hover {
  border-color: #fb923c;
  color: #fb923c;
}

.user-menu__provider:active {
  transform: scale(0.9);
}

.user-menu-panel-enter-active,
.user-menu-panel-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: bottom right;
}

.user-menu-panel-enter-from,
.user-menu-panel-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(0.5rem);
}
</style>
