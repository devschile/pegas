# AGENTS.md

Convenciones de código para este proyecto. Aplican a todo el código nuevo y
al que se toque durante un refactor.

## Este repositorio es público

Se ve desde fuera de la organización y va a seguir así. Eso impone una regla
que no es de estilo: **la lógica de negocio no vive acá.**

Lo comercial —tarifas, reglas de descuento, condiciones pactadas con un
auspiciador, calendarios de campaña, cualquier cosa que forme parte de un
acuerdo— vive en `pegas-core`, que es privado, o directamente en la base de
datos. Acá vive cómo se ve el sitio: páginas, componentes, la API que consume
el propio front, y lo necesario para renderizar lo que la base ya tiene.

La prueba práctica: **si el dato cambia cuando se renegocia un acuerdo, no va
en este repositorio.** Un banner es contenido; su tarifa es un acuerdo.

**Los mensajes de commit y los títulos de PR tampoco nombran acuerdos.** Son
lo primero que se lee desde afuera y quedan indexados. Se describe el cambio
técnico, no con quién se cerró: `feat(ads): campañas con fecha de término`,
nunca el nombre de la empresa que la pidió. Lo mismo vale para comentarios,
nombres de rama y `dev/fixtures.json`, donde los datos de ejemplo son
inventados — ningún auspiciador real, igual que ninguna pega real.

Borrarlo después no arregla nada: el historial de un repositorio público
queda, y los forks ajenos **no** se vuelven privados si algún día se cierra
el original.

## Los auspicios se venden en otro sitio

Pegas **sirve** los espacios publicitarios; no los vende. La página que los
explica y los cotiza vive en el portal B2B de devsChile:

| | |
|---|---|
| Antes | `pegas.devschile.cl/publicitar` |
| Ahora | `empresas.devschile.cl/pegas-devschile` |
| Repo | [`devschile-empresas`](https://github.com/devschile/devschile-empresas) |

Se movió el 2026-09-17 porque el portal concentra los auspicios de todas las
propiedades de devsChile, y un anunciante compara entre ellas: obligarlo a
saltar de sitio en sitio para eso le costaba la venta.

Lo que eso significa acá:

- **No se vuelve a crear una landing de venta en este repo.** Si hay que
  cambiar el texto, las medidas de los espacios o los formatos aceptados, se
  edita en el portal. Este repo define el comportamiento real del espacio;
  aquel describe lo que se vende.
- **La ruta vieja tiene un 301** en `routeRules` de `nuxt.config.ts`. Está
  indexada y con enlaces apuntándole: no se borra a secas.
- **El motor de glifos se fue con ella.** `GlyphField`, `GlyphButton`,
  `AsciiFill`, `TerminalMarquee`, `StackedWordmark`, `useAnimacionAscii` y
  `utils/glyph-field.ts` solo los usaba esa página, así que se borraron en el
  mismo movimiento. Viven en el portal y están en el historial de este repo.
  `Reveal.vue` se quedó: lo usa `PegaCard`.
- **Lo que este repo sí tiene que sostener son las promesas de esa página.**
  La CSP del iframe de ads es la que hace cierto el "sin scripts de terceros"
  —ver `app/utils/__tests__/ads-iframe.spec.ts`—, y si cambia acá, allá hay
  un texto que pasa a ser falso.

## Nombres de identificadores

Funciones, parámetros, métodos y variables van en **inglés, camelCase** —
incluso en un proyecto donde el dominio y la UI están en español.

```ts
// bien
function findCategoryBySlug(categories: string[], slug: string) { ... }
const isRemote = computed(() => Boolean(job.tags?.includes('remote')));

// mal
function encontrarCategoriaPorSlug(categorias: string[], slug: string) { ... }
const esRemoto = computed(() => Boolean(pega.tags?.includes('remote')));
```

**Excepción: el contrato de datos.** Los campos que vienen del `data.json`/la
base de datos (`titulo`, `empleador`, `categoria`, `ubicacion`, `sueldo`,
`fecha_publicacion`, `fecha_creacion`, `fuente`) se dejan tal cual están en
`types/pega.ts`. Ese contrato lo comparte todo el monorepo (n8n, `scripts/`,
`schema.sql`) — traducirlo acá exigiría una capa de mapeo en el fetch y
desincronizaría el nombre del campo respecto a la columna real de la base de
datos, más confuso que útil.

Nombres de componentes Vue (PascalCase) y clases CSS no están cubiertos por
esta regla — siguen sus propias convenciones ya establecidas en el proyecto.

## Español sin voseo

Cualquier texto en español (comentarios, mensajes de commit, copy de la UI)
usa **tú**, no **vos**. "Revisa el resultado", no "Revisá el resultado".

## Comentarios

Por defecto, **no comentar**. Un identificador bien nombrado ya dice el qué.

Cuando hace falta explicar algo (un porqué no obvio, una limitación externa,
un workaround), va como **JSDoc** sobre la función/variable, no como
comentario de línea suelto en medio del código:

```ts
/**
 * ch-button no tiene prop href/target -- es un <button>, no navega solo.
 * Se abre la URL a mano; el tracking va antes del open() porque en Safari
 * a veces el evento no alcanza a mandarse si la pestaña ya perdió foco.
 */
function handleApplyClick() { ... }
```

No documentar lo evidente ("// obtiene la pega" arriba de `getJob()`). Si el
comentario no sobreviviría a la pregunta "¿esto ya no lo dice el nombre?",
no va.

## Tests de `server/`

Todo spec bajo `server/` necesita `// @vitest-environment node` como primera
línea del archivo. `vitest.config.mts` usa `environment: 'nuxt'` a nivel
global (vía `defineVitestConfig`), que registra un `beforeAll` asumiendo un
router de Vue (`useRouter().afterEach(...)`) — revienta con
`Cannot read properties of undefined (reading 'afterEach')` para cualquier
spec fuera de `app/`, incluso uno que no monta ningún componente. La pragma
cambia el entorno solo para ese archivo a `node` (sin `window`), lo cual
evita ese setup; `useRuntimeConfig` y el resto de los auto-imports de Nitro
se siguen mockeando igual con `mockNuxtImport`.

Al mockear un constructor con `vi.hoisted`, usar `function` y no arrow
(`vi.fn(function Pool() { ... })`, no `vi.fn(() => ...)`): una arrow function
no es constructible, y `new MockeadoConArrow()` tira
`TypeError: ... is not a constructor`.
