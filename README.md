# Pegas devsChile()

Vitrina de ofertas de trabajo tech en Chile: [pegas.devschile.cl](https://pegas.devschile.cl)

Listado con búsqueda y filtros, página por pega y por categoría, cuentas para
guardar y reaccionar, SEO (sitemap, `schema.org/JobPosting`, OG images) y
analítica en PostHog.

**Los aportes son bienvenidos** — ver [CONTRIBUTING.md](./CONTRIBUTING.md). Se
puede levantar el sitio completo en local, con datos de ejemplo, sin credenciales
de nada.

## Levantarlo

Hacen falta [pnpm](https://pnpm.io) y Docker.

```bash
pnpm install
cp .env.example .env

docker compose -f docker-compose.dev.yml up -d   # Postgres local
pnpm dev:db                                      # esquema + 60 pegas de ejemplo
pnpm dev                                         # http://localhost:3000
```

Las 60 pegas de `dev/fixtures.json` son inventadas —empresas, avisos y URLs— y
cubren las 13 categorías, con y sin sueldo, remotas y presenciales, más algunas
desactivadas para el panel de administración. Alcanzan para trabajar en
cualquier parte de la interfaz.

Para entrar con sesión iniciada sin registrar aplicaciones OAuth, abre
`http://localhost:3000/auth/dev`. Ese atajo solo existe con `pnpm dev`: en un
build de producción la ruta responde 404.

## Cómo está armado

| | |
|---|---|
| Framework | [Nuxt 4](https://nuxt.com) con renderizado en servidor |
| Design system | [`@devschile/chucao`](https://github.com/devschile/chucao) |
| Animación | [`motion-v`](https://motion.dev) |
| SEO | [`@nuxtjs/seo`](https://nuxtseo.com) |
| Datos | PostgreSQL, consultado desde `server/api/` |
| Tests | [Vitest](https://vitest.dev) + `@vue/test-utils`, cobertura mínima 80% |

```
app/            # páginas, componentes, composables (lo que ve el navegador)
server/api/     # la API que consume el propio sitio
server/utils/   # acceso a la base, sesiones, roles
dev/            # esquema y datos de ejemplo para desarrollo local
test/           # helpers de test
```

Convenciones de código: [`AGENTS.md`](./AGENTS.md). Marca y diseño:
[`DESIGN.md`](./DESIGN.md).

```bash
pnpm test            # una pasada
pnpm test:watch      # modo watch
pnpm test:coverage   # con cobertura (falla bajo 80%)
pnpm build           # build de producción
```

## De dónde salen las pegas

Las pegas reales las ingiere un pipeline que lee newsletters de LinkedIn Jobs y
las APIs públicas de GetOnBoard, WorkingNomads, Jobicy y Himalayas, las
deduplica, las clasifica en 13 categorías y las guarda en la misma base que este
sitio consulta. Ese pipeline vive en un repositorio aparte y privado, junto con
el esquema de la base y los scripts de operación.

Para aportar acá no hace falta: `dev/` trae una copia del esquema y datos de
ejemplo, y el sitio no distingue entre esos y los reales.

Si un cambio necesita una columna que `dev/schema.dev.sql` no tiene, el que
quedó atrás es ese archivo — abre un issue y se regenera, no lo edites a mano.

## Licencia

MIT
