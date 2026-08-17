<script setup lang="ts">
import { ChButton } from '@devschile/chucao/vue';
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
      <span v-else aria-hidden="true">👤</span>
    </button>

    <div v-if="open" class="user-menu__panel">
      <template v-if="loggedIn">
        <NuxtLink to="/mis-pegas" class="user-menu__link" @click="open = false">Mis pegas</NuxtLink>
        <ChButton variant="secondary" @ch-click="handleLogoutClick">Cerrar sesión</ChButton>
      </template>
      <template v-else>
        <a class="user-menu__link" href="/auth/github">Entrar con GitHub</a>
        <a class="user-menu__link" href="/auth/slack">Entrar con Slack</a>
      </template>
    </div>
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
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  border: none;
  background: var(--accent, #2dd4bf);
  color: #0b0f19;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  padding: 0;
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
  color: inherit;
  text-decoration: none;
}

.user-menu__link:hover {
  color: var(--accent, #2dd4bf);
}
</style>
