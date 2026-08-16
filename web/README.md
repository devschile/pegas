# Pegas devsChile() — web

Frontend Nuxt 4 (SSR) de [pegas.devschile.cl](https://pegas.devschile.cl):
listado, búsqueda y filtros de pegas tech, páginas individuales por pega y
por categoría, SEO (sitemap, schema.org JobPosting, OG tags) y tracking en
PostHog.

## Stack

- [Nuxt 4](https://nuxt.com) (SSR)
- [`@devschile/chucao`](https://github.com/devschile/chucao) como design
  system (componentes Stencil + tokens)
- [`motion-v`](https://motion.dev) para animaciones y transiciones de página
- [`@nuxtjs/seo`](https://nuxtseo.com) (sitemap, robots, meta, schema.org)
- [Vitest](https://vitest.dev) + `@vue/test-utils` (cobertura mínima 80%)
- [Husky](https://typicode.github.io/husky) para el pre-commit (lint + tests)

Convenciones de código del proyecto: ver [`AGENTS.md`](./AGENTS.md).

## Setup

Este repo usa **pnpm** (ver `pnpm-workspace.yaml` en la raíz):

```bash
pnpm install
```

## Desarrollo

```bash
pnpm dev
```

Sirve en `http://localhost:3000`.

## Datos

Por ahora consume el `data.json` estático generado por el pipeline de
n8n/PostgreSQL (ver `runtimeConfig.public.dataJsonUrl` en `nuxt.config.ts`).
Cuando exista la API REST del proyecto, solo cambia
`app/composables/useJobs.ts` — el resto de la app consume
`pegas`/`categorias`/`fuentes` sin saber de dónde vienen.

## Tests

```bash
pnpm test           # una pasada
pnpm test:watch     # modo watch
pnpm test:coverage  # con reporte de cobertura (umbral: 80%)
```

## Build

```bash
pnpm build      # build SSR de producción
pnpm preview    # levanta el build de producción localmente
```
