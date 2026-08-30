# Pegas devsChile()

Vitrina de ofertas de trabajo tech en Chile. Las pegas se obtienen parseando newsletters de LinkedIn Jobs (y otras fuentes), se almacenan en PostgreSQL y se publican en un sitio con renderizado en servidor.

## Arquitectura

```
Gmail (newsletters LinkedIn) ─┐
GetOnBoard (API pública v0)   ├─→ n8n (parser + dedup) → PostgreSQL ←→ Nuxt SSR (web/)
WorkingNomads (API pública)  ─┘                                          │
                                                              pegas.devschile.cl
```

El sitio consulta la base en cada request, así que una pega recién ingerida
aparece sin necesidad de redeployar ni regenerar nada.

### Componentes

| Componente | Descripción | Stack |
|------------|-------------|-------|
| **Sitio** | Listado, filtros, fichas de pega y cuentas de usuario | Nuxt 4 SSR + chucao, en `web/` |
| **API** | `/api/pegas`, `/api/meta`, reacciones y guardado | Nitro (dentro de `web/server/`) |
| **Base** | Almacenamiento y deduplicación | PostgreSQL 16 (Coolify) |
| **Ingestión** | Lee emails y APIs de portales, parsea, guarda en BD | n8n workflow |
| **Mantenimiento** | Aplica migraciones y da acceso operativo a la base | `Dockerfile.mantenimiento` |

### Fuentes de pegas

| Fuente | Método | Frecuencia | Filtro |
|--------|--------|------------|--------|
| **LinkedIn** | Parseo de newsletter por email (2 casillas Gmail) | Cada 6h (Gmail Trigger) | Todas las categorías tech detectadas por keyword |
| **GetOnBoard** | API pública v0 (sin auth), `n8n/test-getonbrd.js` valida el filtro | Cada 6h (Schedule Trigger) | Categorías dev/tech (`programming`, `mobile-developer`, `sysadmin-devops-qa`, `data-science-analytics`, `machine-learning-ai`, `cybersecurity`) + solo `countries` incluye `Chile` o `Remote` |
| **WorkingNomads** | API pública `/api/exposed_jobs/` (sin auth) | Cada 6h (junto a GetOnBoard) | `location=latin-america,chile`; todas remotas (`tags: remote`) |

Fuentes evaluadas y descartadas por ahora (ver `plan.md`/`resumen.md` para detalle y razones): RemoteOK (global/US-centric, exige backlink por ToS), We Work Remotely y Remotive (sin foco LatAm), Laborum/Computrabajo/BuscoJobs Chile/beBee/JobLeads (sin API ni RSS públicos — beBee y JobLeads bloquean `/api/` por robots.txt), FinderHR (es un headhunter manual, no un job board), Chiletrabajos (tiene RSS abierto de 31.638 avisos, pero congelado desde el 15/8/2026 — el sitemap sigue vivo, el feed no; además no trae empleador ni sueldo, y solo el 3,4% es de TI), trabajoremotochile.com (tiene API pública real y buena, pero es un espejo de nuestras propias fuentes: de 798 avisos, `source` dice weworkremotely/jobicy/getonbrd/himalayas/remotive y solo 1 es propio), Jooble (API oficial pero exige key con registro; `robots.txt` prohíbe `/SearchResult`), NTT Workday (la API CXS es pública y funciona, pero son 12 avisos de una sola empresa), expertini/recruit.net/Glassdoor (Cloudflare 403), levels.fyi (2 avisos para Chile), Himalayas (API pública real pero volumen masivo y global, requiere filtro geográfico más fino antes de sumarla). Otras evaluadas en julio 2026: it-hunter.cl (bloqueado por Cloudflare, challenge JS), AcidLabs y OPTION/careers-page.com (portales de una sola empresa, sin API pública descubierta — AcidLabs es HTML plano de Odoo, OPTION es un SPA Vue/Manatal), INACAP/emplea.inacap.cl (SPA de Reqlut con token de sesión en la URL, sin resultados sin JS). Google no es una fuente: no tiene API pública de empleos, solo agrega `schema.org/JobPosting` de otros sitios — ver roadmap para la idea de agregar ese schema a nuestras propias pegas.

### Flujo de datos

1. **Trigger** → Gmail Trigger (LinkedIn) o Schedule Trigger (GetOnBoard + WorkingNomads), los tres cada 6h
2. **Parser/Fetch** → Extrae o normaliza título, empleador, link, descripción, categoría, sueldo, tags
3. **Deduplicación** → Verifica contra PostgreSQL (UNIQUE en `url`, `ON CONFLICT DO NOTHING`)
4. **INSERT** → Guarda nueva pega en la BD (nodo único compartido por las tres fuentes)
5. **Digest de Slack (2x/día)** → A las 9:00 y 15:00, un trigger aparte junta todas las pegas nuevas desde el último aviso (de cualquier fuente, marcadas con `notificado_en_digest`) y manda a `#trabajos` un resumen por categoría, con el detalle pega por pega colgando del hilo — ver [Digest de Slack](#digest-de-slack)
6. **Sitio** → Nada que publicar: `web/` lee la base en cada request, así que la pega ya está visible

## Estructura del repositorio

```
├── web/                    # El sitio: Nuxt 4 SSR + su API (ver web/README.md)
├── migrations/             # Esquema de la BD, en orden; las aplica init-db.js
├── scripts/
│   ├── init-db.js          # Aplica las migraciones pendientes (con advisory lock)
│   ├── seed.js             # Datos de prueba para desarrollo local
│   └── reclasificar.js     # Reaplica categorizar() sobre las pegas ya guardadas
├── n8n/
│   ├── workflow.json       # Workflow de n8n (exportado)
│   ├── categorizar.js      # Clasificador por título — FUENTE DE VERDAD
│   ├── sync-categorizar.js # Reinyecta categorizar() en sus 6 copias
│   ├── parser-code.js      # Parser LinkedIn standalone (para tests)
│   ├── test-categorizar.js # Tests del clasificador
│   ├── test-digest.js      # Tests del digest de Slack (corre el jsCode real del nodo)
│   └── test-getonbrd.js    # Valida en vivo el filtro Chile/Remoto de GetOnBoard
├── Dockerfile.mantenimiento # Aplica migraciones y queda vivo para operar la base
├── docker-compose.dev.yml   # Postgres local para desarrollo
└── README.md
```

## Categorización

Cada pega recibe una de 13 categorías a partir de su **título**, con la función
`categorizar()` de `n8n/categorizar.js`:

`AI/ML` · `Backend` · `Ciberseguridad` · `Data/BI` · `DevOps` · `Diseño` ·
`Frontend` · `Full Stack` · `Liderazgo` · `Mobile` · `Otros` · `QA` · `Soporte`

Son reglas de regex evaluadas en orden, y **gana la primera que matchea**: el
orden es la lógica, no un detalle. El stack explícito va primero (`React` →
Frontend) porque es la señal más confiable; los roles transversales van al
final (`Arquitecto de Datos` es Data/BI, no Liderazgo). `n8n/test-categorizar.js`
fija esos desempates — si mueves un bloque de reglas, lo que se rompe ahí te
dice a quién le sacaste la pega.

GetOnBoard y WorkingNomads además traen su propia categoría de origen, que sus
nodos usan **solo** como respaldo cuando el título no alcanza y `categorizar()`
devuelve `Otros` (el `CATEGORIA_FALLBACK` de cada nodo).

### Editarla

Los nodos Code de n8n no pueden importar módulos, así que la función existe
seis veces: una por fuente dentro de `workflow.json` (5) más la de
`parser-code.js`. **Se edita solo `n8n/categorizar.js`** y después:

```bash
npm run sync:categorizar   # reinyecta la función en las 6 copias
npm run test:n8n           # tests + chequeo de que no quedó drift
```

Mantenerlas a mano ya falló: las copias se separaron y a la de GetOnBoard le
faltaban las reglas de `Gestión` y `Soporte`, así que esa fuente no podía
producir ninguna de las dos. Por eso `Soporte` llegó a tener 1 sola pega con
945 publicadas. El hook de pre-commit corre `--check` sobre cualquier cambio
en `n8n/`.

### Reclasificar lo ya guardado

Los nodos categorizan al ingerir, así que un cambio de reglas solo aplica a lo
que entre después. Para las pegas que ya están en la base:

```bash
node scripts/reclasificar.js              # simulación, no escribe
node scripts/reclasificar.js --aplicar    # escribe
```

Corre dentro del contenedor (la base solo es alcanzable desde la red de
Coolify). Es idempotente y **nunca degrada una pega a `Otros`**: eso borraría
las clasificaciones que vinieron del `CATEGORIA_FALLBACK` de la fuente, que no
se guardan en la tabla y no se pueden recuperar desde el título.

Antes de escribir, `--aplicar` imprime un `UPDATE` que devuelve cada pega a su
categoría anterior. **Hay que copiarlo de la terminal antes de seguir**: la
categoría previa no queda guardada en ningún lado, así que sin ese SQL la
reclasificación no tiene vuelta atrás. El tag `v1.0.0` documenta el
procedimiento completo de rollback (`git tag -n99 v1.0.0`).

## Digest de Slack

Dos veces al día (9:00 y 15:00, `America/Santiago`) el workflow publica en
`#trabajos` un resumen de todo lo que entró desde el aviso anterior, y cuelga
del **hilo** de ese mismo mensaje el detalle pega por pega:

````
Cayeron *13* pegas nuevas:

```
Backend      3  ██████████████
DevOps       3  ██████████████
Mobile       2  █████████
```
🌎 6 remotas · 💰 4 con sueldo
Están todas en pegas.devschile.cl

  └─ (en el hilo)
     *Backend*        ← link a /categoria/backend
     • Ingeniero/a de Software C/C++ · ATENTUS — Chile · 💰 USD 1500 - 2500 /mes
       ↑ link a /pega/36991-ingeniero-a-de-software-c-c-atentus
     • …
````

El canal se queda con el resumen para que un aviso ocupe siempre lo mismo,
llegue con 5 pegas o con 109 (el backlog del 27/8/2026 fueron 109 de una);
quien quiere el listado abre el hilo. Antes se listaban 3 pegas en el propio
mensaje, pero con una mediana de ~24 por envío eso era una muestra arbitraria
y encima las más viejas del lote, por el `ORDER BY fecha_creacion ASC` de la
query.

Lo arman cuatro nodos encadenados en `n8n/workflow.json`:

| Nodo | Qué hace |
|---|---|
| `Agrupar notificación` (Code) | Arma el texto del canal y los bloques del hilo. `Marcar notificadas` cuelga de acá en paralelo, así que el digest no se repite aunque el hilo falle |
| `Notificar en #trabajos` (Slack) | Publica el resumen. Su respuesta trae el `ts`, que es el ancla del hilo |
| `Armar hilo de detalle` (Code) | Toma ese `ts` y emite un item por bloque. Sin `ts` no emite nada: mejor sin detalle que soltarlo como mensaje suelto en el canal |
| `Detalle en el hilo` (Slack) | Publica cada bloque como respuesta, con los unfurl apagados |

El detalle se parte en varios mensajes de hilo si pasa los 3800 caracteres
(Slack recomienda no llegar a 4000), cortando entre categorías, o entre líneas
si una sola categoría se pasa.

**Todos los links van al sitio, ninguno al aviso original.** El título de cada
pega lleva a `/pega/{id}-{slug}`, el encabezado de categoría a
`/categoria/{slug}` y el cierre al home. El objetivo del digest es traer
tráfico a pegas.devschile.cl; el link para postular en LinkedIn o GetOnBoard
sigue estando, a un click, en la página de la pega. Todos llevan
`?utm_source=slack&utm_medium=digest&utm_content=…` para poder separar en
PostHog cuánto tráfico trae el digest y qué se clickea.

Del slug solo importa el número: la página lo resuelve con `idFromSlug()`, así
que se recorta a 40 caracteres. Nadie lo ve (el texto visible es el título) y
cada URL se come el presupuesto de caracteres del mensaje — con los slugs
completos, 13 pegas ya no cabían en una sola respuesta del hilo.

**Escape obligatorio.** Los títulos, empleadores y sueldos vienen de LinkedIn y
GetOnBoard, o sea de fuera, y desde este cambio se publican como mrkdwn. Un
aviso titulado `<https://phishing.cl|Postula aquí>` se publicaría en el canal
de la comunidad como un link real con el texto que quiera quien lo escribió.
Por eso todo texto de terceros pasa por `escapar()` (`&` primero, después `<`
y `>`). El destino ya no necesita validarse: se construye con el `id` (entero
de la BD) y un slug que por definición solo tiene `[a-z0-9-]`, así que un
título hostil no puede colarse ahí. `n8n/test-digest.js` fija esos casos.

Ese test no copia el código del nodo: lo lee de `workflow.json` y lo ejecuta
con un `$input` falso, así que siempre corre contra lo que se va a pegar en
n8n. Con `--ver` imprime los mensajes de ejemplo renderizados.

## Base de datos

Tabla `pegas`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | SERIAL PK | |
| `url` | TEXT UNIQUE | Link original a la oferta — clave de deduplicación |
| `titulo` | TEXT | Título de la oferta |
| `empleador` | TEXT | Empresa |
| `descripcion` | TEXT | Descripción extraída |
| `categoria` | TEXT | Categoría (para filtros) — ver [Categorización](#categorización) |
| `ubicacion` | TEXT | Ubicación geográfica |
| `sueldo` | TEXT | Sueldo/rango salarial detectado, si existe |
| `tags` | TEXT | Tags separados por coma (ej. `remote`) |
| `fecha_publicacion` | TIMESTAMP | Fecha de la oferta (real si la fuente la entrega, si no la de ingesta) |
| `fuente` | TEXT | Origen: `linkedin`, `getonbrd`, etc. |
| `email_origen` | TEXT | Casilla de email de donde se parseó (null si no aplica) |
| `activo` | BOOLEAN | Soft delete (default TRUE) |
| `fecha_creacion` | TIMESTAMP | Fecha de ingreso al sistema |

## Desarrollo

```bash
# Postgres local (usuario/clave/base: pega)
docker compose -f docker-compose.dev.yml up -d

npm install
node scripts/init-db.js   # aplica migrations/
node scripts/seed.js      # datos de prueba

# El sitio corre aparte, contra ese mismo Postgres
cd web && pnpm install && pnpm dev
```

Los scripts leen `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`, y por
defecto apuntan a `localhost:5432`, que es lo que publica el compose de arriba.
Ver `web/.env.example` para lo que necesita el sitio.

## Deploy

Hosteado en Coolify (proyecto `pegas.devschile.cl`), con dos aplicaciones sobre
este mismo repositorio y branch `main`:

| App | Qué corre | Dominio |
|-----|-----------|---------|
| `pegas` | `web/Dockerfile` — Nuxt SSR en el puerto 3000 | pegas.devschile.cl |
| `pegas-mantenimiento` | `Dockerfile.mantenimiento` — migraciones y acceso a la base | ninguno |

Las dos despliegan solas con cada push a `main` (webhook de la GitHub App
`devschile`). `pegas-mantenimiento` tiene `watch_paths` acotado a `migrations/`,
`scripts/`, su Dockerfile, su entrypoint y `package.json`, así que un cambio que
solo toca `web/` no la despierta.

**Variables de entorno en Coolify:** `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`,
`PGPASSWORD` (runtime) en ambas aplicaciones; el sitio suma además las de sesión
y OAuth que lista `web/.env.example`.

**Migraciones:** las aplica `pegas-mantenimiento` al desplegarse, con un advisory
lock para que dos arranques solapados no corran la misma dos veces.

## Licencia

MIT

## Roadmap

- [x] Parser de LinkedIn Jobs (emails)
- [x] PostgreSQL + deduplicación por URL
- [x] Frontend con buscador y filtros
- [x] Detección de sueldo/rango salarial
- [x] Filtro "solo pegas con sueldo publicado" en el listado (`?sueldo=1`)
- [x] **GetOnBoard** — API pública v0, sin auth, filtrada a Chile/Remoto (nodos `getonbrd-*` en `n8n/workflow.json`, validado con `n8n/test-getonbrd.js`)
- [x] **WorkingNomads** — API pública `/api/exposed_jobs/`, sin auth, filtrada a LatAm/Chile
- [x] Digest de Slack 2x/día (9:00 y 15:00) en vez de notificar en cada corrida — evita saturar el canal
- [x] Detalle de cada pega (link, empleador, ubicación, sueldo) en el hilo del digest, para no alargar el mensaje del canal
- [ ] Fuentes adicionales — evaluadas y descartadas por ahora: ver tabla "Fuentes de pegas" más arriba. Candidata más viable a futuro: Himalayas (API pública real, pero requiere filtro geográfico más fino por su volumen global)
- [ ] Auto-expiración de pegas antiguas
- [ ] Dashboard de métricas
