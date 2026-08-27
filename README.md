# Pegas devsChile()

Vitrina de ofertas de trabajo tech en Chile. Las pegas se obtienen parseando newsletters de LinkedIn Jobs (y otras fuentes), se almacenan en PostgreSQL y se publican como sitio estático.

## Arquitectura

```
Gmail (newsletters LinkedIn) ─┐
GetOnBoard (API pública v0)   ├─→ n8n (parser + dedup) → PostgreSQL → Static Site (nginx)
WorkingNomads (API pública)  ─┘                                          │
                                                              pegas.devschile.cl
```

### Componentes

| Componente | Descripción | Stack |
|------------|-------------|-------|
| **Frontend** | Sitio estático con buscador y filtros | HTML/CSS/JS vanilla, nginx:alpine |
| **Backend** | API de datos | PostgreSQL 16 (Coolify) |
| **Ingestión** | Lee emails y APIs de portales, parsea, guarda en BD | n8n workflow |
| **Build** | Genera `data.json` desde la BD | Node.js (Dockerfile multi-stage) |

### Fuentes de pegas

| Fuente | Método | Frecuencia | Filtro |
|--------|--------|------------|--------|
| **LinkedIn** | Parseo de newsletter por email (2 casillas Gmail) | Cada 6h (Gmail Trigger) | Todas las categorías tech detectadas por keyword |
| **GetOnBoard** | API pública v0 (sin auth), `n8n/test-getonbrd.js` valida el filtro | Cada 6h (Schedule Trigger) | Categorías dev/tech (`programming`, `mobile-developer`, `sysadmin-devops-qa`, `data-science-analytics`, `machine-learning-ai`, `cybersecurity`) + solo `countries` incluye `Chile` o `Remote` |
| **WorkingNomads** | API pública `/api/exposed_jobs/` (sin auth) | Cada 6h (junto a GetOnBoard) | `location=latin-america,chile`; todas remotas (`tags: remote`) |

Fuentes evaluadas y descartadas por ahora (ver `plan.md`/`resumen.md` para detalle y razones): RemoteOK (global/US-centric, exige backlink por ToS), We Work Remotely y Remotive (sin foco LatAm), Laborum/Computrabajo/BuscoJobs Chile/beBee/JobLeads (sin API ni RSS públicos — beBee y JobLeads bloquean `/api/` por robots.txt), FinderHR (es un headhunter manual, no un job board), Himalayas (API pública real pero volumen masivo y global, requiere filtro geográfico más fino antes de sumarla). Otras evaluadas en julio 2026: it-hunter.cl (bloqueado por Cloudflare, challenge JS), AcidLabs y OPTION/careers-page.com (portales de una sola empresa, sin API pública descubierta — AcidLabs es HTML plano de Odoo, OPTION es un SPA Vue/Manatal), INACAP/emplea.inacap.cl (SPA de Reqlut con token de sesión en la URL, sin resultados sin JS). Google no es una fuente: no tiene API pública de empleos, solo agrega `schema.org/JobPosting` de otros sitios — ver roadmap para la idea de agregar ese schema a nuestras propias pegas.

### Flujo de datos

1. **Trigger** → Gmail Trigger (LinkedIn) o Schedule Trigger (GetOnBoard + WorkingNomads), los tres cada 6h
2. **Parser/Fetch** → Extrae o normaliza título, empleador, link, descripción, categoría, sueldo, tags
3. **Deduplicación** → Verifica contra PostgreSQL (UNIQUE en `url`, `ON CONFLICT DO NOTHING`)
4. **INSERT** → Guarda nueva pega en la BD (nodo único compartido por las tres fuentes)
5. **Redeploy en tiempo real** → Si hubo pegas nuevas en esa corrida, n8n dispara restart en Coolify de inmediato, regenerando `data.json`
6. **Digest de Slack (2x/día)** → A las 9:00 y 18:00, un trigger aparte junta en la BD todas las pegas nuevas desde el último aviso (de cualquier fuente, tracking vía static data del workflow) y manda un solo mensaje a `#trabajos` con hasta 5 listadas
7. **Frontend** → `index.html` carga `data/data.json` y renderiza con filtros

## Estructura del repositorio

```
├── index.html              # Frontend estático
├── css/style.css           # Estilos
├── js/app.js               # Lógica: fetch, filtros, render
├── scripts/
│   ├── generate-json.js    # Lee PostgreSQL → data.json
│   ├── init-db.js          # CREATE TABLE IF NOT EXISTS
│   └── reclasificar.js     # Reaplica categorizar() sobre las pegas ya guardadas
├── schema.sql              # Esquema de la BD
├── n8n/
│   ├── workflow.json       # Workflow de n8n (exportado)
│   ├── categorizar.js      # Clasificador por título — FUENTE DE VERDAD
│   ├── sync-categorizar.js # Reinyecta categorizar() en sus 6 copias
│   ├── parser-code.js      # Parser LinkedIn standalone (para tests)
│   ├── test-categorizar.js # Tests del clasificador
│   └── test-getonbrd.js    # Valida en vivo el filtro Chile/Remoto de GetOnBoard
├── Dockerfile              # Multi-stage: build + nginx:alpine
├── nginx.conf              # Config nginx
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
# Instalar dependencias
npm install

# Generar data.json (requiere DATABASE_URL)
DATABASE_URL=postgres://... node scripts/generate-json.js

# Inicializar BD (crea tabla)
DATABASE_URL=postgres://... node scripts/init-db.js
```

## Deploy

Hosteado en Coolify como aplicación GitHub (`devschile/pegas`).

**Build:** Dockerfile multi-stage — la etapa de build ejecuta `init-db.js` + `generate-json.js` y copia `data.json` a la imagen nginx final.

**Variables de entorno requeridas en Coolify:**
- `DATABASE_URL`: connection string de PostgreSQL

**Redeploy trigger:** n8n llama a la API de Coolify para redeployar cuando hay pegas nuevas.

## Licencia

MIT

## Roadmap

- [x] Parser de LinkedIn Jobs (emails)
- [x] PostgreSQL + deduplicación por URL
- [x] Frontend con buscador y filtros
- [x] Detección de sueldo/rango salarial
- [x] **GetOnBoard** — API pública v0, sin auth, filtrada a Chile/Remoto (nodos `getonbrd-*` en `n8n/workflow.json`, validado con `n8n/test-getonbrd.js`)
- [x] **WorkingNomads** — API pública `/api/exposed_jobs/`, sin auth, filtrada a LatAm/Chile
- [x] Digest de Slack 2x/día (9:00 y 18:00) en vez de notificar en cada corrida — evita saturar el canal
- [ ] Fuentes adicionales — evaluadas y descartadas por ahora: ver tabla "Fuentes de pegas" más arriba. Candidata más viable a futuro: Himalayas (API pública real, pero requiere filtro geográfico más fino por su volumen global)
- [ ] Auto-expiración de pegas antiguas
- [ ] Dashboard de métricas
