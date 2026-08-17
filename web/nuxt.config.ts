// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['motion-v/nuxt', '@nuxtjs/seo', 'nuxt-auth-utils'],

  css: ['~/assets/css/main.css'],

  // Config base de @nuxtjs/seo (sitemap, robots, meta por defecto,
  // schema.org): sin esto los modulos no saben bajo que dominio/nombre
  // generar URLs absolutas, OG tags, etc.
  site: {
    url: 'https://pegas.devschile.cl',
    name: 'Pegas devsChile()',
    description: 'Vitrina de ofertas de trabajo tech en Chile y remoto LatAm, agregadas desde LinkedIn, GetOnBoard, WorkingNomads, Jobicy e Himalayas.',
    defaultLocale: 'es',
  },

  // URLs dinamicas (pegas individuales, categorias): no hay rutas fisicas
  // que rastrear, asi que se registra el endpoint que las genera a partir
  // del mismo data.json (ver server/api/__sitemap__/urls.ts).
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },

  // No generamos imagenes OG por pagina (requeriria un template propio y
  // renderizado via navegador headless en cada request/build) -- se usa un
  // og:image estatico fijo en su lugar (ver useSeoMeta en cada pagina).
  ogImage: {
    enabled: false,
  },

  runtimeConfig: {
    // Estas claves permiten override via NUXT_PG_HOST etc, pero
    // server/utils/db.ts resuelve con precedencia a las PG* planas (mismo
    // nombre que usan n8n y scripts/ en la raiz del monorepo) para no
    // mantener dos juegos de secrets distintos en Coolify.
    pg: {
      host: '',
      port: '5432',
      database: 'pega',
      user: 'pega',
      password: '',
    },
    public: {
      // Mismo proyecto de PostHog que ya usa el sitio estatico actual
      // (index.html), para no partir el analytics en dos durante la
      // convivencia de ambos frontends.
      posthogKey: 'phc_pMbrDFcoVoYS9kqBRmgLEzdTjuNXYqV4sypn7YsnFuY4',
      posthogHost: 'https://us.i.posthog.com',
    },
  },

  app: {
    head: {
      link: [
        // Pineado a la version instalada de @devschile/chucao (package.json)
        // para que el CSS y los componentes no se desincronicen.
        { rel: 'stylesheet', href: 'https://static.devschile.cl/chucao/1.6.0/chucao.css' },
        // Mismo favicon (emoji como SVG) que el sitio estatico actual.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
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
