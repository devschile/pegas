// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      // Fuente de datos actual: el data.json estatico del pipeline existente
      // (ver scripts/generate-json.js). Reemplazar por la URL de la API REST
      // cuando exista -- ver app/composables/usePegas.ts.
      dataJsonUrl: 'https://pegas.devschile.cl/data/data.json',
    },
  },

  app: {
    head: {
      link: [
        // Pineado a la version instalada de @devschile/chucao (package.json)
        // para que el CSS y los componentes no se desincronicen.
        { rel: 'stylesheet', href: 'https://static.devschile.cl/chucao/1.5.1/chucao.css' },
      ],
    },
  },
});
