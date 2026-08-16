# AGENTS.md

Convenciones de código para este proyecto (`web/`). Aplican a todo el código
nuevo y al que se toque durante un refactor.

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
