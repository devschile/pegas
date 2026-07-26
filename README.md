# Pegas devsChile()

Vitrina de ofertas de trabajo tech en Chile. Las pegas se obtienen parseando newsletters de LinkedIn Jobs (y otras fuentes), se almacenan en PostgreSQL y se publican como sitio estático.

## Arquitectura

```
Gmail (newsletters LinkedIn) ─┐
                               ├─→ n8n (parser + dedup) → PostgreSQL → Static Site (nginx)
GetOnBoard (API pública v0)  ─┘                                          │
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
| **LinkedIn** | Parseo de newsletter por email (2 casillas Gmail) | Cada 30 min (Gmail Trigger) | Todas las categorías tech detectadas por keyword |
| **GetOnBoard** | API pública v0 (sin auth), `n8n/test-getonbrd.js` valida el filtro | Cada 6h (Schedule Trigger) | Categorías dev/tech (`programming`, `mobile-developer`, `sysadmin-devops-qa`, `data-science-analytics`, `machine-learning-ai`, `cybersecurity`) + solo `countries` incluye `Chile` o `Remote` |

Fuentes evaluadas y descartadas por ahora (ver `plan.md`/`resumen.md` para detalle y razones): RemoteOK (global/US-centric, exige backlink por ToS), We Work Remotely y Remotive (sin foco LatAm), Laborum/Computrabajo/BuscoJobs Chile/beBee/JobLeads (sin API ni RSS públicos — beBee y JobLeads bloquean `/api/` por robots.txt), FinderHR (es un headhunter manual, no un job board), Himalayas (API pública real pero volumen masivo y global, requiere filtro geográfico más fino antes de sumarla). Google no es una fuente: no tiene API pública de empleos, solo agrega `schema.org/JobPosting` de otros sitios — ver roadmap para la idea de agregar ese schema a nuestras propias pegas.

### Flujo de datos

1. **Trigger** → Gmail Trigger (LinkedIn, cada 30 min) o Schedule Trigger (GetOnBoard, cada 6h)
2. **Parser/Fetch** → Extrae o normaliza título, empleador, link, descripción, categoría, sueldo, tags
3. **Deduplicación** → Verifica contra PostgreSQL (UNIQUE en `url`, `ON CONFLICT DO NOTHING`)
4. **INSERT** → Guarda nueva pega en la BD (nodo único compartido por ambas fuentes)
5. **Slack + Redeploy** → Si hubo pegas nuevas, notifica a `#pegas` y n8n dispara redeploy en Coolify, regenerando `data.json`
6. **Frontend** → `index.html` carga `data/data.json` y renderiza con filtros

## Estructura del repositorio

```
├── index.html              # Frontend estático
├── css/style.css           # Estilos
├── js/app.js               # Lógica: fetch, filtros, render
├── scripts/
│   ├── generate-json.js    # Lee PostgreSQL → data.json
│   └── init-db.js          # CREATE TABLE IF NOT EXISTS
├── schema.sql              # Esquema de la BD
├── n8n/
│   ├── workflow.json       # Workflow de n8n (exportado)
│   ├── parser-code.js      # Parser LinkedIn standalone (para tests)
│   └── test-getonbrd.js    # Valida en vivo el filtro Chile/Remoto de GetOnBoard
├── Dockerfile              # Multi-stage: build + nginx:alpine
├── nginx.conf              # Config nginx
└── README.md
```

## Base de datos

Tabla `pegas`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | SERIAL PK | |
| `url` | TEXT UNIQUE | Link original a la oferta — clave de deduplicación |
| `titulo` | TEXT | Título de la oferta |
| `empleador` | TEXT | Empresa |
| `descripcion` | TEXT | Descripción extraída |
| `categoria` | TEXT | Categoría (para filtros) |
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
- [x] Notificación agrupada en Slack
- [x] Detección de sueldo/rango salarial
- [x] **GetOnBoard** — API pública v0, sin auth, filtrada a Chile/Remoto (nodos `getonbrd-*` en `n8n/workflow.json`, validado con `n8n/test-getonbrd.js`)
- [ ] Fuentes adicionales — evaluadas y descartadas por ahora: ver tabla "Fuentes de pegas" más arriba. Candidata más viable a futuro: Himalayas (API pública real, pero requiere filtro geográfico más fino por su volumen global)
- [ ] Auto-expiración de pegas antiguas
- [ ] Dashboard de métricas
