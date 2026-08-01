// Workflow separado en n8n (no vive en workflow.json principal):
// "SALUD: pipeline de pegas atrasado"
// id: mcXruRChe6AamLCt — creado y publicado directo en n8n vía API.
//
// Corre cada 4h: lee la tabla pipeline_heartbeat (ver schema.sql) y compara
// cuánto hace que cada fuente del pipeline principal corrió de verdad
// contra el máximo esperado. Si alguna está atrasada, un solo DM de Slack
// con el detalle. Si todo está al día, 0 items y no manda nada -- sin
// heartbeat de "todo bien", solo avisa cuando hay algo que atender.
//
// Por qué una tabla y no mirar el estado interno de n8n: el bug del
// watermark del digest (ver commit b470a26) mostró que el static data de un
// workflow se pisa cada vez que se edita por API -- mecanismo frágil para
// algo que necesita sobrevivir ediciones frecuentes. La tabla vive en
// Postgres, fuera del alcance de esas ediciones.
//
// Umbrales (con margen sobre el intervalo real de cada fuente):
//   gmail          cron cada 6h   -> alerta si pasan >10h
//   getonbrd_cron  cron cada 6h   -> alerta si pasan >10h
//   digest         2x/día (~6h)   -> alerta si pasan >20h (cubre saltarse
//                                    un disparo entero y llegar al segundo)
//
// Limitación conocida: Gmail Trigger es un trigger de tipo polling que solo
// arranca una ejecución cuando encuentra emails nuevos que matchean el
// filtro -- si genuinamente no llega ningún email de LinkedIn en la
// ventana, no hay forma de distinguir "corrió y no encontró nada" de
// "dejó de correr". El umbral de 10h asume que un day sin ningún email es
// raro dado el volumen habitual; si empieza a dar falsos positivos, subir
// el umbral en vez de sacar la alerta.
//
// Cómo se alimenta pipeline_heartbeat: el workflow principal
// (n8n/workflow.json) tiene un nodo "Latido: <fuente>" colgado como rama
// paralela de cada trigger (Gmail Trigger, GetOnBoard: cada 6h,
// Notificación 2x/día) -- corre siempre que el trigger dispara, sin
// importar si encontró pegas nuevas o no. Es un INSERT ... ON CONFLICT DO
// UPDATE de una sola fila por fuente, sin parámetros.
//
// SDK code usado para crearlo (referencia, no se ejecuta desde acá):
//
// import { workflow, node, trigger, newCredential } from '@n8n/workflow-sdk';
//
// const cadaCuatroHoras = trigger({
//   type: 'n8n-nodes-base.scheduleTrigger',
//   version: 1,
//   config: {
//     name: 'Cada 4h',
//     parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 */4 * * *' }] } }
//   }
// });
//
// const leerLatidos = node({
//   type: 'n8n-nodes-base.postgres',
//   version: 2.6,
//   config: {
//     name: 'Leer latidos',
//     parameters: {
//       operation: 'executeQuery',
//       query: 'SELECT fuente, EXTRACT(EPOCH FROM (NOW() - ultima_corrida)) / 3600 AS horas FROM pipeline_heartbeat'
//     },
//     credentials: { postgres: newCredential('Postgres account') }
//   }
// });
//
// ... Evaluar atraso (Code, umbrales por fuente) -> Avisar atraso (Slack DM)
