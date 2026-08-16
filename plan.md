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
- Recuperadas manualmente algunas pegas que se habían perdido por un problema puntual de sincronización de un disparador automático.
- Investigadas y descartadas varias fuentes adicionales candidatas — sin API pública utilizable, bloqueadas por protección anti-bots, o de una sola empresa (detalle en el README).
- Sumadas dos fuentes más de pegas (Jobicy y Himalayas), ambas remoto-LatAm.
- Scaffold del frontend nuevo (Nuxt SSR + chucao) en `web/`, consumiendo el `data.json` actual a través de un composable aislado. Tests con Vitest, cobertura mínima 80% forzada por Husky en cada commit.

## Pendiente

- Confirmar que el despliegue automático desde el repositorio funcione de punta a punta (hoy a veces requiere disparo manual).
- Revisar si queda alguna instancia vieja o duplicada del sitio que se pueda dar de baja.
- Cerrar issues abiertos en GitHub.
- Confirmar en el próximo ciclo que la fuente de pegas agregada más recientemente sigue funcionando sin errores.
- Evaluar sumar más fuentes de pegas.
- Evaluar reemplazar el parseo de newsletters por email de LinkedIn por su API directamente (si es que ofrece una accesible para este uso). El parseo de emails es fundamentalmente frágil: cada vez que LinkedIn cambia el formato del newsletter hay que ajustar el parser, y ya tuvo varios bugs de esa naturaleza. El riesgo conocido es que la API de empleos de LinkedIn suele requerir partnership aprobado, no acceso self-service — hay que confirmar si existe alguna vía utilizable antes de invertir en esto.
- Agregar datos estructurados a las pegas para mejorar el posicionamiento en buscadores.
- Auto-expiración de pegas antiguas.
- Dashboard de métricas.
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
- [ ] **2. Desplegar `web/` en paralelo al sitio estático** (Dockerfile o preset Cloudflare propio; subdominio/puerto de prueba, el público sigue viendo el sitio actual)
- [ ] **3. Cutover del sitio estático al nuevo frontend** (swap de DNS/proxy una vez validado en paralelo; recién ahí se retira `index.html`/`css/`/`js/`)
- [ ] **4. API REST** (reemplaza `usePegas()` leyendo `data.json` por Postgres real; prerequisito de todo lo que implica escritura — publicar pega, login, destacar, pagos; también la consumiría el bot de Slack)
- [ ] **5. Registro de usuarios** (cuentas para empresas —publicar/gestionar pegas— y candidatos —alertas personalizadas, guardar pegas—; requiere la API con auth del paso 4)
- [ ] **6. Monetización** (una vez hay registro: publicación paga, ranking/destacados, tracking tipo ecommerce en PostHog, suscripción paga — detalle arriba)

## Pendiente técnico

- **SSR real de chucao vía `@devschile/chucao/hydrate`** (disponible desde chucao 1.6.0, usa Declarative Shadow DOM). Podría ser la causa real del delay de ~2s en aplicar estilos que se investigó y quedó sin resolver — hoy los componentes se registran client-side, así que no hay contenido con estilos reales hasta que el JS bootea. Requiere un hook `render:html` en Nitro que post-procese el HTML ya renderizado por Vue, corriendo cada tag `ch-*` a través de `renderToString` del paquete. No es trivial, evaluar con foco dedicado.
