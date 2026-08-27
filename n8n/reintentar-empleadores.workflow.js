// Workflow separado en n8n (no vive en workflow.json principal):
// "GetOnBoard: reintentar empleadores 'No especificado' (diario)"
// id: rTY2yr7I2OC5Gk5W — creado y publicado directo en n8n vía MCP.
// (El "(diario)" del nombre quedó obsoleto el 2026-08-22, ver abajo.)
//
// Vuelve a pedir las mismas 7 categorías de GetOnBoard, resuelve nombre de
// empresa por cada company_id, y hace UPDATE solo de las filas que quedaron
// con empleador = 'No especificado' (típicamente por rate-limit o timeouts
// puntuales de la API al momento del insert original). Solo puede resolver
// avisos que sigan apareciendo en el listado actual de GetOnBoard -- uno que
// ya salió del listado queda sin poder recuperarse por esta vía. Reusa
// exactamente la misma lógica que las ramas "GetOnBoard: *" del workflow
// principal.
//
// El WHERE acotado a 'No especificado' no es solo una optimización: es lo
// que hace que este workflow NUNCA pise un empleador ya resuelto, sea que lo
// haya puesto el scrape o una corrección a mano.
//
// OJO con la zona horaria al leer los horarios de acá: el workflow corre en
// America/Santiago (UTC-4), pero el historial de ejecuciones de n8n se
// muestra en UTC. El trigger anterior decía "5:00" y en el historial aparecía
// a las 09:00 -- son la misma hora, no un bug.
//
// 2026-08-22: pasa de diario (5:00) a cada 6h, con cron '0 1,7,13,19 * * *'.
// El scrape de GetOnBoard corre '0 */6 * * *' (00,06,12,18), así que un
// aviso que entraba con empleador sin resolver esperaba hasta 24h por su
// reparación -- y como el listado ordena por fecha, esas filas rotas quedan
// justo arriba de la portada, que es donde más se notan. Con el cron nuevo
// cada scrape tiene su retry 1 hora después: la ventana baja de ~24h a ~1h.
//
// Se evaluó encadenarlo al final del workflow principal (nodo Execute
// Workflow) en vez de esto, y se descartó: correría en el mismo instante del
// scrape, justo cuando la API de GetOnBoard viene de recibir cientos de
// llamadas, que es la causa probable de los 'No especificado' en primer
// lugar. Una hora después tiene mejor chance, y además deja el retry
// desacoplado -- si falla, no puede tumbar el scrape.
//
// 2026-08-01: el trigger original usaba un intervalo relativo
// (hoursInterval: 24) y dejó de correr en silencio después de dos
// ejecuciones exitosas -- más de 3 días sin disparar, sin haberse
// desactivado. No se confirmó la causa raíz (sospecha: un intervalo
// relativo no sobrevive bien un restart/redeploy del servicio de n8n,
// a diferencia de un horario fijo que se recalcula desde el reloj).
// Se cambió a hora fija diaria, mismo patrón ya confirmado estable en
// el digest de Slack del workflow principal.
//
// SDK code usado para crearlo (referencia, no se ejecuta desde acá):
//
// import { workflow, node, trigger, newCredential } from '@n8n/workflow-sdk';
//
// const retryTrigger = trigger({
//   type: 'n8n-nodes-base.scheduleTrigger',
//   version: 1,
//   config: {
//     name: 'Cada día',  // el nombre del nodo quedó igual por compatibilidad
//     parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 1,7,13,19 * * *' }] } }
//   }
// });
//
// El cambio de trigger del 2026-08-22 se hizo por la UI de n8n, no por SDK:
// update_workflow exige reescribir el workflow completo, y la definición que
// devuelve la API no incluye las credenciales del nodo Postgres -- recrearlo
// desde acá lo habría dejado sin conexión a la base, en silencio.
//
// ... categorías -> Fetch Jobs -> Normalizar -> IDs únicos -> Fetch Company
// -> Combinar -> Update Empleador (mismas funciones que
// n8n/workflow.json, nodo "GetOnBoard: filtrar + normalizar" y
// "GetOnBoard: combinar empresa", más un UPDATE en vez de INSERT):
//
// UPDATE pegas SET empleador = $1
// WHERE url = $2 AND fuente = 'getonbrd' AND empleador = 'No especificado'
