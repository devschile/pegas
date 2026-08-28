# Plan — historial y pendientes

Registro de trabajo hecho y tareas pendientes del proyecto. Se va actualizando a medida que se resuelven cosas.

## Completado

- Corregido un bug que dejaba el sitio sin mostrar pegas, causado por una desincronización entre el esquema de la base de datos y el código de inserción.
- Reforzada la configuración del servidor para no exponer archivos de configuración por error (falso positivo de seguridad, corregido de todas formas).
- Automatizada la ingesta de pegas desde LinkedIn (parseo de newsletters por email) y GetOnBoard (API pública), con deduplicación automática por link.
- Sumada una tercera fuente de pegas con API pública.
- Corregido un bug de nombres de empresa mal resueltos en una de las fuentes; agregado un reintento automático periódico para los casos que fallan puntualmente.
- Unificada la frecuencia de todas las fuentes de ingesta.
- Rediseñada la notificación por chat: en vez de avisar por cada pega nueva (saturaba el canal), ahora se manda un resumen dos veces al día con lo nuevo de todas las fuentes.
- Corregido un bug donde el resumen podía mostrar un aviso vacío o incorrecto cuando no había pegas nuevas, y ajustado el horario para que corra en la zona horaria correcta.
- Mejorado el resumen de chat: el canal ve el conteo por categoría más cuántas pegas son remotas y cuántas publican sueldo, y el detalle de cada pega (título con link, empresa, ubicación y sueldo) se publica en el hilo del mismo mensaje. Así un aviso ocupa siempre lo mismo en el canal, llegue con 5 pegas o con 109, y quien quiere el listado lo abre. Cada pega del hilo enlaza a su página en el sitio (y cada categoría a su listado filtrado), no al aviso original: la idea es llevar tráfico al sitio, donde el botón para postular en la fuente sigue estando a un click. Los enlaces van marcados para poder medir en las analíticas cuánto tráfico trae el resumen. Los textos vienen de fuentes externas, así que se escapan antes de publicarlos: sin eso, un aviso con sintaxis de link en el título podía publicar un enlace falso en el canal de la comunidad.
- Recuperadas manualmente algunas pegas que se habían perdido por un problema puntual de sincronización de un disparador automático.
- Investigadas y descartadas varias fuentes adicionales candidatas — sin API pública utilizable, bloqueadas por protección anti-bots, o de una sola empresa (detalle en el README).
- Sumadas dos fuentes más de pegas (Jobicy y Himalayas), ambas remoto-LatAm.
- Scaffold del frontend nuevo (Nuxt SSR + chucao) en `web/`, consumiendo el `data.json` actual a través de un composable aislado. Tests con Vitest, cobertura mínima 80% forzada por Husky en cada commit.

## Pendiente

- Confirmar que el despliegue automático desde el repositorio funcione de punta a punta (hoy a veces requiere disparo manual).
- Revisar si queda alguna instancia vieja o duplicada del sitio que se pueda dar de baja.
- Cerrar issues abiertos en GitHub.
- Los nodos de Jobicy e Himalayas quedaron en producción con una versión vieja del clasificador (sin la guarda de avisos que no son de TI, sin el Backend ampliado y sin el arreglo de "infraestructura"). Hoy no molesta porque ningún disparador los alimenta —están sueltos en el canvas—, pero si alguien los reconecta esas dos fuentes van a clasificar con las reglas viejas. El chequeo automático no lo detecta: compara el repositorio contra sí mismo, nunca contra lo que corre en producción. Se decidió dejarlos así por ahora (27/8/2026).
- Confirmar en el próximo ciclo que la fuente de pegas agregada más recientemente sigue funcionando sin errores.
- Evaluar sumar más fuentes de pegas. La ronda del 28/8/2026 (ocho candidatas) no dejó ninguna integrable — detalle en `resumen.md`. Lo que sí mostró: los avisos remotos LatAm que otros agregadores revenden vienen de Jobicy e Himalayas, que ya están construidas acá pero con los nodos desconectados. Reconectarlas (actualizando antes su clasificador) es la vía más barata a más volumen, y hay que decidirlo a conciencia porque son remotas globales con foco LatAm parcial.
- **Próxima sesión (29/8/2026): llevar el clasificador actual a los nodos de Jobicy e Himalayas y ver si mejora.** Hoy corren una copia vieja que devuelve `Data` y `Gestión`, categorías que dejaron de existir con la migración 006 — si alguien reconecta esos nodos sin actualizarlos primero, empiezan a escribir categorías huérfanas que no aparecen en ningún filtro del sitio. En la base ya hay 30 pegas de Jobicy y 10 de Himalayas, y esas sí quedaron con las categorías nuevas, así que sirven de muestra para comparar antes y después. Un error concreto ya visible en esa muestra: `Tax Analyst (Direct Tax)` quedó en Data/BI — la guarda de avisos que no son de TI no cubre los roles de finanzas o impuestos que traen la palabra "analyst". Después de actualizarlos, decidir si se reconectan al disparador.
- Si alguna vez se busca volumen corporativo: cualquier empresa que use Workday expone una API pública en `POST /wday/cxs/{tenant}/{sitio}/jobs` (verificado con NTT). Una fuente que recorra varios tenants chilenos es viable; una sola empresa no vale la pena.
- Chequear de vez en cuando si Chiletrabajos revive su RSS: `curl -sI https://www.chiletrabajos.cl/rss.xml | grep -i last-modified` devuelve la fecha sin descargar los 18 MB. Hoy está congelado en el 15/8/2026 aunque el portal sigue publicando (~12 pegas de TI al día). Si vuelve a moverse vale la pena integrarlo; el detalle de la evaluación está en `resumen.md`.
- Evaluar reemplazar el parseo de newsletters por email de LinkedIn por su API directamente (si es que ofrece una accesible para este uso). El parseo de emails es fundamentalmente frágil: cada vez que LinkedIn cambia el formato del newsletter hay que ajustar el parser, y ya tuvo varios bugs de esa naturaleza. El riesgo conocido es que la API de empleos de LinkedIn suele requerir partnership aprobado, no acceso self-service — hay que confirmar si existe alguna vía utilizable antes de invertir en esto.
- Agregar datos estructurados a las pegas para mejorar el posicionamiento en buscadores.
- Auto-expiración de pegas antiguas.
- Dashboard de métricas.
- Medir en PostHog si el resumen de chat con enlaces al sitio efectivamente trae tráfico (llegan marcados con `utm_source=slack&utm_medium=digest`, y `utm_content` distingue si clickearon una pega, una categoría o el cierre). Sin ese número no se sabe si el cambio sirvió.
- Evaluar migrar el frontend a un enfoque con renderizado en servidor para mejorar SEO e indexabilidad (cambio de arquitectura grande, no es urgente).

## Monetización

El sitio ya tiene tráfico y contenido diferenciado (agregación multi-fuente que no existe en un solo lugar). La idea es capturar valor de dos lados: empresas que quieren publicar/destacar pegas, y candidatos que quieren mejores herramientas de búsqueda. Puntos a explorar, sin orden de prioridad definido todavía salvo el primero:

- **API de pegas (primer paso).** Hoy no existe una API real: el frontend estático consume un `data.json` regenerado en cada deploy, que no sirve para clientes dinámicos. Hay que exponer una API propia que sirva de base para todo lo demás — consumida por el nuevo frontend (Nuxt SSR + chucao), el bot de Slack, y potenciales integraciones de terceros. Debe cubrir como mínimo lo que hoy hace `data.json` (listar/filtrar pegas) y dejar el camino abierto para lo pagado (crear pega autenticado, destacar, eventos de tracking).
- **Publicación de pegas por empresas.** Formulario propio (autenticado) en vez de depender solo de las fuentes agregadas — permite cobrar por publicación directa.
- **Ranking / destacados.** Pegas patrocinadas con posición prioritaria o badge visual en el listado.
- **Tracking tipo ecommerce con PostHog.** Ya está instalado para analytics del sitio; falta modelarlo como funnel (impresión de pega → click → postulación) en vez de solo pageviews, para poder mostrarle métricas a una empresa que paga.
- **Sistema de registro.** Cuentas para empresas (publicar/gestionar pegas) y candidatos (alertas personalizadas, guardar pegas).
- **Suscripción paga.** Planes para empresas (publicar, destacar, ver métricas) y quizás un plan para candidatos (alertas curadas, acceso anticipado).

## Roadmap: frontend nuevo → monetización

Orden acordado para llegar de `web/` (scaffold ya hecho) a la monetización. Se va marcando a medida que se avanza.

- [x] **1. Completar el frontend nuevo (`web/`) contra el `data.json` actual**
  - [x] Filtros y búsqueda (categoría, fuente)
  - [x] Header/branding con chucao
  - [x] Paginación
  - [x] Meta tags por página (title/description dinámico, OG tags, schema.org JobPosting) — aprovechando el SSR
- [x] **2. Desplegar `web/` en paralelo al sitio estático** (Dockerfile en `web/`, app nueva en Coolify servida en `pegas-staging.devschile.cl`; el público sigue viendo el sitio actual en `pegas.devschile.cl`)
- [x] **3. Cutover del sitio estático al nuevo frontend** — `pegas.devschile.cl` ya sirve el Nuxt (verificado el 27/8/2026: el HTML trae `__NUXT`, y `/api/pegas`, `/pega/:slug` y las 13 rutas `/categoria/:slug` responden 200). Queda pendiente retirar `index.html`/`css/`/`js/` del repo y revisar si sobra alguna instancia vieja.
- [x] **4. API REST** (reemplaza `usePegas()` leyendo `data.json` por Postgres real; prerequisito de todo lo que implica escritura — publicar pega, login, destacar, pagos; también la consumiría el bot de Slack)
  - [x] Endpoints de solo lectura: `GET /api/pegas` (filtros + paginación), `GET /api/pegas/:id`, `GET /api/meta` (cacheado 300s) — contra el esquema actual de `pegas` (sin `estado`/`destacada`/`fijada` todavía, esas columnas llegan con Fase 3/4 de moderación)
  - [x] Frontend conectado a la API en vez de `data.json`: `useJobs.ts`/`useJobsListing.ts` reescritos (paginación y filtrado en SQL, debounce 300ms + sync de query string), `SiteHeader.vue`/`index.vue`/`categoria/[categoria].vue`/`pega/[id].vue` y el sitemap consumen `/api/pegas`, `/api/pegas/:id` y `/api/meta`. Probado end-to-end contra Postgres local con datos reales.
- [ ] **5. Registro de usuarios** (cuentas para empresas —publicar/gestionar pegas— y candidatos —alertas personalizadas, guardar pegas—; requiere la API con auth del paso 4)
  - [x] Fundación: login OAuth (GitHub + Slack, sin usuario/contraseña) vía `nuxt-auth-utils`, migración `002_cuentas.sql` (tabla `usuarios`, rol `candidato` por defecto), `findOrCreateUser`/`getUserRole` en `server/utils/usuarios.ts` (rol nunca se guarda en la sesión sellada, siempre se relee de la base). Login vive en `UserMenu.vue`, botón fijo abajo a la derecha (no en el header). Probado contra Postgres local; falta registrar la GitHub OAuth App y la Slack App reales y cargar credenciales en Coolify para probar el flujo de punta a punta. Hay un bypass `/auth/dev` solo activo bajo `pnpm dev` para probar sin credenciales.
  - [x] Reacciones y guardado: migración `003_reacciones.sql` (`pegas_estado_usuario`, fila se borra cuando queda vacía), `server/utils/reacciones.ts`, endpoints `/api/me`, `/api/me/pegas`, `/api/me/pegas-estado` y `POST /api/pegas/:id/{reaccion,guardado}`. Cada `PegaCard` tiene botones like/nolike (excluyentes)/guardar (independiente), deshabilitados sin sesión. `usePegaReactions` comparte estado entre cards vía `useState` y evita N+1 con un fetch batch por página. Página nueva `/mis-pegas`. Probado de punta a punta contra Postgres local con el bypass `/auth/dev`.
  - [ ] Publicar/gestionar pega (empresas) y alertas personalizadas (candidatos) — pendiente
- [ ] **6. Monetización** (una vez hay registro: publicación paga, ranking/destacados, tracking tipo ecommerce en PostHog, suscripción paga — detalle arriba)

## Feat pendiente: panel admin con tabs + Ads

Hoy lo que hace de panel admin es la página `/mis-pegas`: muestra las pegas guardadas/reaccionadas del usuario y, si el rol es `admin`, agrega al final una sección suelta con las pegas desactivadas (`GET /api/pegas/desactivadas` + `POST /api/pegas/:id/activar`). Con la llegada de Ads eso deja de escalar como lista apilada, así que el pendiente tiene dos partes.

**1. Tabs en el panel.** Reorganizar `/mis-pegas` en pestañas en vez de secciones apiladas: `Guardadas`, `Desactivadas` (solo admin) y `Ads` (solo admin). La tab activa debería quedar en la query string para poder compartir/recargar sin perderla.

**2. CRUD de Ads.** Sección nueva para crear y administrar banners que se muestran en `pegas.devschile.cl`. Un ad tiene:
- **Formato horizontal siempre** (no hay variante vertical ni cuadrada; conviene fijar una relación de aspecto y un alto máximo para que ningún ad rompa el layout del listado).
- **Contenido**: HTML pegado o imagen subida (excluyentes entre sí).
- **Link** de destino.
- **Estado** activo / inactivo.
- **Ubicaciones**: header (arriba de todo), entremedio de las cards de pegas (uno por página de paginación) y footer (antes de la paginación). Se puede elegir una, dos o las tres a la vez, así que la ubicación es un conjunto, no un valor único.

**Notas de implementación**
- Migración nueva `migrations/007_ads.sql` (la última aplicada es la `006`): tabla `ads` con las columnas de arriba y las ubicaciones como arreglo/`jsonb` o tabla puente `ads_ubicaciones`.
- Endpoints de escritura (`POST`/`PATCH`/`DELETE /api/ads`) detrás de `requireAdmin` de `server/utils/admin.ts` — igual que `activar`/`desactivar`. El endpoint público de lectura debe devolver **solo** los ads activos y nada de metadatos internos.
- El render del ad entremedio de las cards toca `PegaCard`/el grid del listado y la paginación; el del footer va antes de `PegasPaginacion.vue`.
- Cobertura mínima 80% forzada por Husky: la migración, los endpoints y los componentes nuevos necesitan tests en el mismo commit.

**Seguridad — esto es lo delicado del feat**
- **HTML arbitrario = XSS con privilegios de la sesión de quien navega.** Un `v-html` directo con lo que pegó un admin permite robar la cookie de sesión de cualquier visitante, incluida la de otro admin. Las opciones sanas son sanitizar en el servidor con una allowlist estricta de tags/atributos antes de guardar y también al renderizar, o aislar el ad en un `iframe` con `sandbox` y CSP propia. Cualquiera de las dos, pero no `v-html` crudo.
- **El link hay que validarlo por protocolo** (solo `http`/`https`): `javascript:` y `data:` en un `href` son ejecución de código. Los anchors salientes van con `rel="noopener noreferrer"` y `target="_blank"`.
- **La subida de imágenes necesita validar tipo real y tamaño** (no confiar en la extensión ni en el `Content-Type` que manda el cliente), servir desde una ruta que no ejecute nada, y definir dónde viven los archivos — el contenedor es efímero, así que o va a un volumen persistente o a almacenamiento externo.
- **Autorización en el servidor, no en la UI.** Esconder la tab no protege nada: cada endpoint de escritura revalida el rol contra la base (`getUserRole`), que es como ya funciona el resto.
- Si se suma CSP para el iframe, ojo con no romper PostHog ni chucao.

## Pendiente técnico

- **SSR real de chucao vía `@devschile/chucao/hydrate`** (disponible desde chucao 1.6.0, usa Declarative Shadow DOM). Podría ser la causa real del delay de ~2s en aplicar estilos que se investigó y quedó sin resolver — hoy los componentes se registran client-side, así que no hay contenido con estilos reales hasta que el JS bootea. Requiere un hook `render:html` en Nitro que post-procese el HTML ya renderizado por Vue, corriendo cada tag `ch-*` a través de `renderToString` del paquete. No es trivial, evaluar con foco dedicado.
