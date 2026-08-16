# Resumen del proyecto — pegas.devschile.cl

Reconstruido a partir de `context.md` (chat de Slack con NotPudu) y el estado actual del repo.

## Objetivo

Leer emails de LinkedIn Jobs (newsletter) desde 2 casillas de Gmail, parsear título/empleador/link/ubicación/sueldo, deduplicar por URL, guardar en PostgreSQL, y publicar en `pegas.devschile.cl` como sitio estático. Notificar avisos nuevos a Slack (#trabajos) y disparar redeploy en Coolify.

## Arquitectura actual

```
Gmail (2 casillas, label pegas-linkedin) → n8n (parser + dedup) → PostgreSQL → Slack (#trabajos) → POST /__regenerate (redeploy)
                                                                                                        │
                                                                                          pegas.devschile.cl (nginx:alpine)
```

## Qué se hizo (por orden cronológico)

### 1. Diseño y scaffolding inicial
- Repo `devschile/pegas` creado en GitHub, README con arquitectura documentada.
- Frontend estático (HTML/CSS/JS vanilla) con buscador y filtros.
- Rediseño completo con identidad visual de **devschile.cl**: fondo `#100a1c` con gradiente radial púrpura/magenta, accent teal `#2dd4bf`, glass-morphism en cards.
- Tipografía: **Inconsolata** en headings (h1–h6), **Fira Sans** en el resto del texto, importadas desde Google Fonts.
- Paginación de 25 avisos por página, con reset a página 1 al filtrar.

### 2. Parser de emails
- Parser (`n8n/parser-code.js`) probado contra 3 emails reales → **11/11 pegas** extraídas correctamente.
- Decodifica quoted-printable, separa bloques por avisos, extrae título/empleador/ubicación/URL.
- Categorización automática por keywords (Frontend, Backend, Full Stack, DevOps, Data, Mobile, QA, Ciberseguridad, Gestión, Diseño, Soporte, Otros).
- Detección de sueldo/rango salarial.
- Detección de tag **remote/remoto/teletrabajo/home office**.
- Extracción correcta del ID real de LinkedIn desde `/comm/jobs/view/{ID}/?trackingId=...` → normalizado a `https://www.linkedin.com/jobs/view/{ID}/`.

### 3. Base de datos (PostgreSQL en Coolify)
- Tabla `pegas` creada con schema completo (incluye columna `tags` agregada después).
- **Bug encontrado y corregido**: `scripts/seed.js` tenía IDs de LinkedIn **inventados/hardcodeados** que no correspondían a los avisos reales (ej. "Desarrolladores Java Angular Quarkus" tenía ID falso `4365792244` en vez del real `4441833193`). Esto hacía que los links llevaran a avisos equivocados.
- Corregido: TRUNCATE de la tabla + reseed con los 11 IDs reales extraídos de los emails.

### 4. Deploy en Coolify
- Varias iteraciones de infraestructura:
  - App inicial como Docker image directa (sin build) → funcionaba pero sin CI/CD.
  - Recreada apuntando a `devschile/pegas` en GitHub → deploy automático por push.
  - Dockerfile multi-stage: build con Node (`npm install`) + imagen final `nginx:alpine`.
  - `docker-entrypoint.sh` corre al iniciar el contenedor: `init-db.js` → `seed.js` → `generate-json.js` → `nginx`.
- Problemas resueltos en el camino:
  - Rutas de CSS/JS servidas planas en vez de en subdirectorios → corregido en Dockerfile/HTML.
  - File storage de Coolify no se reflejaba sin restart del contenedor → se optó por manejar todo vía entrypoint + volumen.
  - Dominio `pegas.devschile.cl` apuntaba a la app vieja (cacheado por Cloudflare) → app vieja eliminada, dominio reasignado a la nueva.
  - Deploy automático se rompió porque el repo se puso **privado** y la GitHub App `devschile` no tenía `pull` access → pendiente de re-autorizar (ver Pendientes).
- Push a GitHub resuelto vía **Deploy Key SSH** (el token OAuth había expirado).

### 5. Slack
- Notificación agrupada: un solo mensaje a `#trabajos` (canal `C0R6AM4DP`) por lote de pegas nuevas detectadas, con emoji, categoría, sueldo y link.

### 6. Seguridad / limpieza
- Emails de prueba (`.eml`, ~176KB) eliminados del repo (contenían PII).
- Revisión de todo el repo por credenciales hardcodeadas (password/secret/token/DATABASE_URL) → **limpio**, todo usa `process.env.PG*`. Repo confirmado seguro para volver a público.

## Estado actual (según el chat, no verificado en vivo)

| Componente | Estado |
|---|---|
| Frontend | Vivo en pegas.devschile.cl, diseño devschile.cl aplicado, responsive, paginación 25 |
| PostgreSQL | `pega-db` — tabla `pegas` con 11 registros (IDs corregidos), columna `tags` agregada |
| Parser | 11/11 validado, incluye sueldo + tag remote |
| n8n workflow | JSON completo en `n8n/workflow.json`, **no importado/activado aún** |
| CI/CD GitHub → Coolify | Configurado pero **roto**: repo se puso privado y la GitHub App `devschile` no tiene `pull` access al repo `pegas` |
| Slack | Nodo configurado apuntando a canal `#trabajos`, pendiente de credencial real en n8n |

⚠️ **Esta tabla quedó desactualizada** — ver la sección "conexión a Coolify real" más abajo, que verificó el estado en vivo el 2026-07-26: el CI/CD **sí funciona**, pero la BD real quedó con `data.json` en 0 pegas por un bug de migración (ya corregido localmente, falta pushear).

## Sesión 2026-07-26: nueva fuente GetOnBoard + investigación de otras fuentes

Trabajo hecho localmente en el repo (no deployado, no probado contra la BD real — ver `plan.md`):

- **Investigada la API pública v0 de GetOnBoard** (`getonbrd.com/api/v0`) con llamadas reales: **no requiere autenticación** para lectura. Endpoints usados: `GET /categories/{slug}/jobs` y `GET /companies/{id}`. Cada job trae `countries` (array), `remote` (bool), `min_salary`/`max_salary`, `published_at` (epoch), `category_name`, y `links.public_url` (URL directa, estable — sirve como clave de dedup igual que con LinkedIn).
- **Bug pre-existente encontrado y corregido**: el nodo `PostgreSQL INSERT` de `n8n/workflow.json` tenía `fuente` **hardcodeado a `'linkedin'`** en el texto del query y **no insertaba la columna `tags`** — es decir, aunque el parser de LinkedIn ya detectaba el tag `remote` (agregado en una sesión anterior), nunca llegaba a la BD. Corregido: el INSERT ahora es genérico (recibe `tags`, `fuente` y `fecha_publicacion` como parámetros vía `queryReplacement`), así sirve para cualquier fuente futura sin tocarlo de nuevo.
- **Agregada la rama GetOnBoard al workflow** (`n8n/workflow.json`): `Schedule Trigger (6h)` → genera las 6 categorías relevantes (`programming`, `mobile-developer`, `sysadmin-devops-qa`, `data-science-analytics`, `machine-learning-ai`, `cybersecurity`) → `HTTP Request` por categoría → `Code` que filtra a pegas con `countries` incluyendo `Chile` o `Remote` y normaliza al esquema de `pegas` → resuelve IDs de empresa únicos → `HTTP Request` a `/companies/{id}` → `Code` que combina el nombre real de la empresa → mismo nodo `PostgreSQL INSERT` que ya usaba LinkedIn (fan-in). No necesita credenciales nuevas en n8n (API pública, sin token).
- **Mensaje de Slack actualizado** para no decir "desde LinkedIn" y mostrar la fuente (`LinkedIn`/`GetOnBoard`) de cada pega nueva.
- **Validado en vivo** con `n8n/test-getonbrd.js` (script standalone, sin n8n): de 235 pegas revisadas (50 por categoría × 6 categorías, sin duplicados entre categorías), **223 son relevantes** (Chile o Remoto). El filtro funciona bien.
- **README actualizado**: arquitectura, tabla de fuentes, estructura del repo, columnas de la tabla `pegas`, roadmap.
- **Otras fuentes investigadas y su resultado** (con llamadas reales, no solo documentación):
  - **RemoteOK** (`remoteok.com/api`): pública, sin auth, pero **global/US-centric** y sus Términos de Servicio exigen backlink visible ("with follow") si se usa su data — no se integró por el desajuste de foco geográfico + la obligación de atribución.
  - **We Work Remotely**: RSS válido (`weworkremotely.com/categories/remote-programming-jobs.rss`), pero todas las ofertas son `region: Anywhere in the World` — sin señal de LatAm, alto ruido.
  - **Remotive** (`remotive.com/api/remote-jobs`): API pública, pero en la muestra las ubicaciones eran "Worldwide/USA/Europa" — sin presencia LatAm real en la muestra revisada, y piden no llamar más de un par de veces al día.
  - **Himalayas** (`himalayas.app/jobs/api`): API pública real, JSON limpio, **~96.000 jobs totales** — volumen masivo y global (tiene `locationRestrictions` y `categories` para filtrar, pero requeriría trabajo adicional de filtrado geográfico + de categoría para no traer basura). Candidata más viable a futuro, no implementada aún.
  - **Laborum.cl, Computrabajo.cl, BuscoJobs.cl** (portales chilenos): no se encontró API pública ni RSS gratuito. Computrabajo tiene API pero vía agregadores de pago (ej. TheirStack) — no gratuita ni de acceso directo. Quedan descartados salvo que se opte por scraping (no evaluado, tiene implicancias de ToS).
  - **Arbeitnow**: el endpoint público redirigió (301) en la prueba — no se profundizó, baja prioridad por no tener foco Chile/LatAm de todos modos.

### Sesión 2026-07-26 (cont.): Google Jobs, beBee, FinderHR, JobLeads

- **Google**: no existe una "Google Jobs API" pública para extraer datos. Google for Jobs es un agregador que lee marcado `schema.org/JobPosting` de otros sitios (LinkedIn, GetOnBoard, etc.) y los muestra en su buscador — no es una fuente que se pueda consultar. Lo aprovechable es al revés: si `pegas.devschile.cl` agrega ese schema a sus propias pegas, podría aparecer en Google for Jobs (visibilidad de salida, no de entrada). Anotado como idea de roadmap, no como fuente.
- **beBee** (`bebee.com/cl/jobs`): Chile-específico (~220k avisos reportados en la página), pero su `robots.txt` tiene `Disallow: /api/` explícito — existe una API pero está bloqueada para bots. Sin RSS real (`/rss` y `/feed` son redirects genéricos a home, no feeds).
- **FinderHR** (`finderhr.cl`): no es un job board sino un headhunter/reclutador manual (contacto por WhatsApp/Calendly, "primer headhunter 100% digital de Chile"). No hay listado programático que ingerir.
- **JobLeads** (`jobleads.com/cl/jobs`): agregador grande (dice 12M+ empleos), pero también `Disallow: /api/` en robots.txt. La URL `/cl/jobs/rss` no es un feed real — devuelve la SPA en HTML (catch-all de ruteo del lado cliente).
- **Decisión**: los tres quedan descartados. No se intentó scraping de HTML ni pegarle a los `/api/` que ambos sitios bloquean explícitamente por robots.txt — es una señal clara de que no quieren acceso automatizado ahí, y además scraping HTML es más frágil que una API/RSS real.

### Sesión 2026-07-26 (cont.): conexión a Coolify real — diagnóstico del sitio vacío

El usuario dio un token de la API de Coolify (`coolify.devschile.cl`, permisos read/write/deploy) — se guardó en `.env` (gitignorado). Con eso se pudo confirmar en vivo:

- **CI/CD: no confirmado (corrección de un error propio)**: se vio el deploy del commit `4fc112d` con `status: "finished"` y se concluyó que el CI/CD funcionaba — el usuario aclaró que ese deploy lo disparó **manualmente** él en Coolify, no un webhook automático de GitHub. Sigue sin confirmarse si push→deploy automático funciona; puede que el bloqueo de la GitHub App descrito en `context.md` siga vigente.
- **`pega-db`**: `running:healthy`, mismo UUID (`mawcbxmdv77ozzp84rk2iog0`) que aparece en `context.md` — confirma que es el proyecto correcto.
- **n8n**: sigue `running:unhealthy`, igual que en el último estado del chat. Sigue sin revisar a fondo (ver `plan.md` sección 3).
- **El sitio en vivo mostraba 0 de 0 pegas** (antes eran 11). Causa raíz encontrada en los logs de runtime del contenedor: `seed.js` falla con `error: column "tags" of relation "pegas" does not exist`. `scripts/init-db.js` solo corre `CREATE TABLE IF NOT EXISTS`, que no modifica una tabla que ya existía — así que cuando se agregó la columna `tags` a `schema.sql` en una sesión anterior, nunca se propagó a la tabla real en producción. **Corregido localmente**: `init-db.js` ahora corre `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` para `sueldo`, `tags` y `fecha_actualizacion` después del `CREATE TABLE IF NOT EXISTS`, para que sea idempotente sin importar cuándo se creó la tabla. **Falta pushear y confirmar que el próximo deploy la corrige** (ver `plan.md` sección 0.5).
- **Hallazgo de seguridad (falso positivo, pero real mala práctica)**: los logs de acceso mostraban decenas de bots automatizados pidiendo `/tmp/.env`, `/cron/.env`, `/.env.backup1`, etc., todos con **HTTP 200**. Se verificó que es el fallback SPA de nginx (`try_files ... /index.html`) sirviendo `index.html` para cualquier ruta desconocida — no hay un `.env` real expuesto (el `.env` con credenciales vive solo en n8n/Coolify, nunca en el web root de este contenedor). Igual se corrigió `nginx.conf` para bloquear explícitamente dotfiles con `deny all; return 404;` antes del fallback, como buena práctica defensiva. **Falta pushear.**
