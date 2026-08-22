<script setup lang="ts">
/**
 * Se renderiza via Satori (nuxt-og-image), no en un navegador -- por eso
 * estilos inline en vez de las clases scoped del resto del sitio, y por que
 * el logo va como <img> a un archivo real en public/ (Satori no puede leer
 * un componente Vue con su propio <style>, solo el arbol de nodos + CSS
 * inline que le llega).
 */
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <div
    style="
      width: 1200px;
      height: 630px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #120f24;
      padding: 64px;
      position: relative;
    "
  >
    <div style="position: absolute; top: 0; left: 0; right: 0; height: 10px; background: #2dd4bf;" />

    <div
      style="
        position: absolute;
        width: 340px;
        height: 340px;
        right: -80px;
        bottom: -80px;
        border-radius: 9999px;
        background: rgba(133, 66, 43, 0.25);
      "
    />

    <span style="color: #2dd4bf; font-family: Inconsolata, monospace; font-size: 30px; font-weight: 700;">
      Pegas devsChile()
    </span>

    <div style="display: flex; flex-direction: column; gap: 20px; max-width: 760px;">
      <h1
        style="
          color: #ffffff;
          font-family: Inconsolata, monospace;
          font-size: 60px;
          font-weight: 700;
          line-height: 1.15;
          margin: 0;
        "
      >
        {{ title }}
      </h1>
      <p v-if="subtitle" style="color: rgba(255, 255, 255, 0.6); font-family: Inconsolata, monospace; font-size: 28px; margin: 0;">
        {{ subtitle }}
      </p>
    </div>

    <img src="/huemul-icono.png" style="position: absolute; right: 64px; bottom: 56px; width: 150px; height: 150px;" />
  </div>
</template>
