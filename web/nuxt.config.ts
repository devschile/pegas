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

  vite: {
    ssr: {
      // Los componentes de Stencil (@devschile/chucao) usan import() dinamico
      // hacia chunks internos compartidos (p-*.js) resueltos con rutas
      // relativas dentro de node_modules. Externalizados, Nitro no logra
      // resolver esos chunks en runtime (500 "Cannot find module .../p-*.js").
      // Sin externalizar, Rollup los empaqueta enteros en el server bundle.
      noExternal: ['@devschile/chucao'],
    },
  },
});
