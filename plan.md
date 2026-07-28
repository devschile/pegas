# Plan — pasos pendientes

Actualizado 2026-07-26 tras conectar directo a la API de Coolify (`coolify.devschile.cl`, vía token en `.env`, gitignorado) y verificar el estado real del proyecto `pegas-v2`, `pega-db` y el servicio `n8n`. Todo lo marcado como "confirmado en vivo" viene de llamadas reales a la API de Coolify hechas en esta sesión, no del chat.

## 0. Fix urgente: sitio con 0 pegas — RESUELTO

**Confirmado en vivo**: `https://pegas.devschile.cl/data/data.json` devuelve `total: 0`. Causa raíz en los logs de runtime del contenedor `pegas-v2`: `seed.js` falla con `error: column "tags" of relation "pegas" does not exist`. `scripts/init-db.js` solo corre `CREATE TABLE IF NOT EXISTS`, que no altera una tabla que ya existía — la columna `tags` (agregada a `schema.sql` en una sesión anterior) nunca se propagó a la tabla real.

- [x] Diagnosticado con los logs reales de Coolify (`/api/v1/applications/{uuid}/logs`).
- [x] Corregido localmente: `scripts/init-db.js` ahora corre `ALTER TABLE pegas ADD COLUMN IF NOT EXISTS` para `sueldo`, `tags`, `fecha_actualizacion` después del `CREATE TABLE IF NOT EXISTS`.
- [x] Corregido localmente (hallazgo colateral, ver sección 1): `nginx.conf` ahora bloquea dotfiles explícitamente.
- [x] Commiteado y pusheado a `main` (commit `6bffb08`).
- [x] Deploy disparado manualmente por el usuario en Coolify (confirmó que el push solo no dispara nada — ver sección 2). Deploy `finished`.
- [x] **Confirmado en logs**: `init-db` corrió sin warnings, `seed` insertó las 11 pegas, `generate-json` las exportó. `data.json` en vivo vuelve a mostrar `total: 11`.

## 1. Hallazgo de seguridad (falso positivo, pero corregido igual)

**Confirmado en vivo**: los logs de acceso de `pegas-v2` muestran decenas de bots automatizados pidiendo `/tmp/.env`, `/cron/.env`, `/.env.backup1`, etc. — todos devolviendo **HTTP 200**. Verificado que es el fallback SPA de nginx (`try_files ... /index.html`) sirviendo `index.html` para cualquier ruta desconocida, **no un `.env` real expuesto** (el `.env` con credenciales vive solo en Coolify/n8n, nunca en el web root de este contenedor — se comparó byte a byte y son idénticos al `index.html` real).

- [x] Corregido localmente: `nginx.conf` agrega `location ~ /\. { deny all; return 404; }` antes del fallback SPA.
- [x] Pusheado y deployado junto con el fix de la sección 0. Confirmado en vivo: `/.env` y `/cron/.env` ahora devuelven 404 (antes 200 con `index.html`).

## 2. CI/CD GitHub → Coolify: NO confirmado — corrección de un error mío

**Corrección**: dije antes que "el CI/CD sí funciona" porque vi el deploy del commit `4fc112d` con `status: "finished"`. Eso fue una inferencia incorrecta de mi parte — ese deploy lo disparó el usuario **manualmente** en Coolify, no un webhook automático de GitHub. No hay evidencia todavía de que un push a `main` dispare un deploy solo. El bloqueo de la GitHub App descrito en `context.md` (repo privado sin `pull` access) puede seguir sin resolverse.

- [ ] Confirmar si el webhook de GitHub → Coolify está configurado y funcionando (revisar en GitHub → repo `pegas` → Settings → Webhooks, y en Coolify → `pegas-v2` → Configuration → Source).
- [ ] Mientras tanto, cada push necesita un deploy manual (por UI o vía `POST /api/v1/applications/{uuid}/deploy` con el token).
- [ ] Eliminar la app vieja en Coolify si todavía existe (UUID `d12ie4e9yif4l2k3mz2i5vuc` según `context.md` — no verificado en esta sesión, la lista de apps actual ya no la muestra así que probablemente ya fue eliminada).

## 3. n8n — sigue unhealthy, GetOnBoard sin importar

**Confirmado en vivo**: el servicio `n8n` (UUID `msk0os84k8gkw4o4w480g4sc`) está `running:unhealthy`, igual que en el último estado del chat. Nada de lo de n8n se ha podido probar todavía.

- [ ] Revisar por qué está unhealthy (logs del servicio, healthcheck) antes de asumir que el workflow puede correr.
- [ ] Importar `n8n/workflow.json` actualizado (incluye la rama GetOnBoard agregada en esta sesión — ver `resumen.md`). Si ya había una versión importada, hay que reemplazarla para que tome el INSERT corregido (antes ignoraba `tags` y hardcodeaba `fuente='linkedin'`).
- [ ] Credencial **Gmail** (x2): OAuth2 para las 2 casillas que reciben el newsletter de LinkedIn.
- [ ] Credencial **PostgreSQL**: apunta a `mawcbxmdv77ozzp84rk2iog0:5432`, base `pega`.
- [ ] Credencial **Slack**: token/webhook para el canal `#trabajos` (channel ID `C0R6AM4DP`, correcto — el nodo se llamaba "#pegas" por error, es el mismo canal, solo se corrigió el nombre del nodo en `workflow.json`).
- [x] **UUID desactualizado corregido**: el nodo `Redeploy pegas.devschile.cl` apuntaba a `d1fmi194ygz7qjbtuzik5b0y` (una app vieja/recreada), no al UUID real de `pegas-v2` (`kje083n02of5w3nh6llm7sot`, confirmado en vivo). Ya corregido en `n8n/workflow.json`, pendiente de push + reimportar en n8n.
- [x] **Variable de entorno `COOLIFY_TOKEN`**: cambiado el nodo a `POST .../applications/kje083n02of5w3nh6llm7sot/restart` (no `/deploy` — restart re-corre el entrypoint y regenera `data.json` sin rebuildear la imagen desde git). Token de Coolify con permiso `deploy` únicamente creado por el usuario, agregado como env var `COOLIFY_TOKEN` (runtime) en el servicio `n8n` vía API, y servicio reiniciado — confirmado `running:healthy` después del restart.
- [ ] Activar el workflow y probar el ciclo completo: Gmail/GetOnBoard → parser → dedup → INSERT → Slack → redeploy.

## 4. GetOnBoard — hecho localmente, falta desplegar en n8n

- [x] Investigada la API pública de GetOnBoard (sin auth, JSON:API, `countries`/`remote`/`published_at`/`links.public_url`).
- [x] Agregada la rama completa a `n8n/workflow.json` (schedule 6h → categorías → fetch → filtro Chile/Remoto → resolución de empresa → mismo INSERT).
- [x] Validado con `n8n/test-getonbrd.js` contra la API real (223/235 relevantes).
- [x] Todo el pipeline corriendo en producción: LinkedIn + GetOnBoard → Postgres → dedup → Slack (#trabajos, máx 5 avisos + contador) → restart. Confirmado con pegas reales.
- [x] **Empleador "No especificado"**: bug de matching posicional arreglado (la API de `/companies/{id}` devuelve el slug, no el ID pedido, así que el match por key nunca pegaba). Además, se creó un workflow separado y programado en n8n — **"GetOnBoard: reintentar empleadores 'No especificado' (diario)"** (id `rTY2yr7I2OC5Gk5W`, activo, corre cada 24h) — que reintenta resolver los que fallan puntualmente (rate-limit, timeouts). Código de referencia en `n8n/reintentar-empleadores.workflow.js`.
- [ ] Decidir si 6h sigue siendo la frecuencia correcta para el fetch principal de GetOnBoard.

## 5. Validaciones post-arreglo

- [ ] Confirmar que `pegas.devschile.cl` vuelve a mostrar las 11 pegas con los links correctos.
- [ ] Confirmar visualmente el badge "Remoto".
- [ ] Correr el flujo un día completo y verificar que no se dupliquen pegas (`UNIQUE(url)` + `ON CONFLICT DO NOTHING` ya está).

## 6. Roadmap (no bloqueante, del README)

- [x] ~~Integrar GetOnBoard~~ — ver sección 4.
- [ ] **Himalayas** como próxima fuente candidata: API pública real, pero ~96k jobs globales — necesita filtro geográfico más cuidadoso.
- [ ] Fuentes descartadas (ver `resumen.md`): RemoteOK, We Work Remotely, Remotive, Laborum/Computrabajo/BuscoJobs Chile, Arbeitnow, beBee, FinderHR, JobLeads.
- [ ] **Google for Jobs — no es fuente, es canal de salida**: agregar `schema.org/JobPosting` a las pegas de `pegas.devschile.cl` para aparecer en el buscador de Google.
- [ ] Auto-expiración de pegas antiguas (columna `activo` ya existe).
- [ ] Dashboard de métricas.
- [ ] **Migrar a Nuxt + SSR**: el sitio hoy es una SPA vanilla (HTML estático + `app.js` que hace `fetch('data/data.json')` y renderiza en el cliente). Un crawler que no ejecute JS (Bing y varios bots) ve la página vacía ("Cargando pegas..."), y no hay URLs individuales por aviso indexables. Nuxt con SSR resolvería esto de raíz: HTML con los avisos ya renderizados en cada request/build, páginas propias por pega (habilita `schema.org/JobPosting` por aviso, ver punto anterior), y mejor SEO en general. Es un cambio de arquitectura grande (reemplaza `index.html`/`js/app.js`/el Dockerfile actual), no una tarea rápida — evaluar cuándo se justifique la inversión.
