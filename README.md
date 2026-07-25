# Pegas DevsChile

Vitrina de ofertas de trabajo tech en Chile. Las pegas se obtienen parseando newsletters de LinkedIn Jobs (y en el futuro GetOnBoard y otras fuentes), se almacenan en PostgreSQL y se publican como sitio estático.

## Arquitectura

```
Gmail (newsletters LinkedIn) → n8n (parser + dedup) → PostgreSQL → Static Site (nginx)
                                                                      │
                                                          pegas.devschile.cl
```

### Componentes

| Componente | Descripción | Stack |
|------------|-------------|-------|
| **Frontend** | Sitio estático con buscador y filtros | HTML/CSS/JS vanilla, nginx:alpine |
| **Backend** | API de datos | PostgreSQL 16 (Coolify) |
| **Ingestión** | Lee emails, parsea, guarda en BD | n8n workflow |
| **Build** | Genera `data.json` desde la BD | Node.js (Dockerfile multi-stage) |

### Flujo de datos

1. **Gmail Trigger** → n8n lee emails de LinkedIn Jobs (filtro por remitente)
2. **Parser** → Extrae título, empleador, link, descripción, categoría
3. **Deduplicación** → Verifica contra PostgreSQL (UNIQUE en `url`)
4. **INSERT** → Guarda nueva pega en la BD
5. **Redeploy** → n8n dispara redeploy en Coolify, regenerando `data.json`
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
│   └── workflow.json       # Workflow de n8n (exportado)
├── Dockerfile              # Multi-stage: build + nginx:alpine
├── nginx.conf              # Config nginx
└── README.md
```

## Base de datos

Tabla `pegas`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | SERIAL PK | |
| `url` | TEXT UNIQUE | Link original (LinkedIn) — clave de deduplicación |
| `titulo` | TEXT | Título de la oferta |
| `empleador` | TEXT | Empresa |
| `descripcion` | TEXT | Descripción extraída |
| `categoria` | TEXT | Categoría (para filtros) |
| `ubicacion` | TEXT | Ubicación geográfica |
| `fecha_publicacion` | TIMESTAMP | Fecha de la oferta |
| `fuente` | TEXT | Origen: 'linkedin', 'getonbrd', etc. |
| `email_origen` | TEXT | Casilla de email de donde se parseó |
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
- [ ] **GetOnBoard** — API pública disponible en `https://www.getonbrd.com/api/v0` (ver `huemul/scripts/pegas.js` para referencia de integración)
- [ ] Fuentes adicionales (Indeed, RemoteOK, We Work Remotely)
- [ ] Auto-expiración de pegas antiguas
- [ ] Dashboard de métricas
