// Workflow separado en n8n (no vive en workflow.json principal):
// "GetOnBoard: reintentar empleadores 'No especificado' (diario)"
// id: rTY2yr7I2OC5Gk5W — creado y publicado directo en n8n vía MCP.
//
// Corre una vez al día a hora fija: vuelve a pedir las mismas 7 categorías
// de GetOnBoard, resuelve nombre de empresa por cada company_id, y hace
// UPDATE solo de las filas que quedaron con empleador = 'No especificado'
// (típicamente por rate-limit o timeouts puntuales de la API al momento
// del insert original). Solo puede resolver avisos que sigan apareciendo
// en el listado actual de GetOnBoard -- uno que ya salió del listado queda
// sin poder recuperarse por esta vía. Reusa exactamente la misma lógica
// que las ramas "GetOnBoard: *" del workflow principal.
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
// const dailyTrigger = trigger({
//   type: 'n8n-nodes-base.scheduleTrigger',
//   version: 1,
//   config: {
//     name: 'Cada día',
//     parameters: { rule: { interval: [{ field: 'days', daysInterval: 1, triggerAtHour: 5, triggerAtMinute: 0 }] } }
//   }
// });
//
// ... categorías -> Fetch Jobs -> Normalizar -> IDs únicos -> Fetch Company
// -> Combinar -> Update Empleador (mismas funciones que
// n8n/workflow.json, nodo "GetOnBoard: filtrar + normalizar" y
// "GetOnBoard: combinar empresa", más un UPDATE en vez de INSERT):
//
// UPDATE pegas SET empleador = $1
// WHERE url = $2 AND fuente = 'getonbrd' AND empleador = 'No especificado'
