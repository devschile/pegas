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

## Pendiente

- Confirmar que el despliegue automático desde el repositorio funcione de punta a punta (hoy a veces requiere disparo manual).
- Revisar si queda alguna instancia vieja o duplicada del sitio que se pueda dar de baja.
- Cerrar issues abiertos en GitHub.
- Confirmar en el próximo ciclo que la fuente de pegas agregada más recientemente sigue funcionando sin errores.
- Evaluar sumar más fuentes de pegas.
- Agregar datos estructurados a las pegas para mejorar el posicionamiento en buscadores.
- Auto-expiración de pegas antiguas.
- Dashboard de métricas.
- Evaluar migrar el frontend a un enfoque con renderizado en servidor para mejorar SEO e indexabilidad (cambio de arquitectura grande, no es urgente).
