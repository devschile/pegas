#!/bin/bash
# Exporta el workflow publicado de n8n a n8n/workflow.json.
#
# Usa el MCP server de n8n (N8N_URL + N8N_API_KEY en .env), no n8n-cli: esa CLI
# nunca estuvo instalada en la máquina de nadie, así que este script jamás
# corrió y n8n/workflow.json se quedó congelado en el 14 de agosto mientras el
# workflow real seguía cambiando. Esa deriva fue la que después hizo que
# reimportar el archivo del repo reviviera Jobicy e Himalayas.
#
# Exporta la versión PUBLICADA (activeVersion), no el borrador del editor.
#
# Uso: ./n8n/export.sh [workflow-id]

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Se referencia por ID, no por nombre: en n8n hay dos workflows llamados
# "pegas: LinkedIn Jobs → PostgreSQL → Slack → Deploy". Este es el pipeline
# real de 30 nodos; el otro (rTY2yr7I2OC5Gk5W) es "GetOnBoard: reintentar
# empleadores", que quedó con ese nombre por un import equivocado.
WORKFLOW_ID="${1:-ah2kXtL4EtNVKEGW}"

set -a; . "$REPO_DIR/.env"; set +a
: "${N8N_URL:?falta N8N_URL en .env}"
: "${N8N_API_KEY:?falta N8N_API_KEY en .env}"

echo "📤 Exportando workflow $WORKFLOW_ID..."
curl -s -m 60 -X POST "$N8N_URL" \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_workflow_details\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\"}}}" \
  | sed -n 's/^data: //p' \
  | python3 -c "
import json, sys
r = json.load(sys.stdin).get('result', {})
if r.get('isError'):
    sys.exit('n8n devolvió error: ' + str(r.get('content')))
w = json.loads(r['content'][0]['text'])['workflow']
av = w.get('activeVersion') or {}
if not av.get('nodes'):
    sys.exit('el workflow no tiene versión publicada')
json.dump({
    'name': w['name'],
    'nodes': av['nodes'],
    'connections': av['connections'],
    'settings': w.get('settings', {}),
    'staticData': None,
    'pinData': {},
    'versionId': w.get('activeVersionId'),
    'active': w.get('active', False),
}, open('$REPO_DIR/n8n/workflow.json', 'w'), indent=2, ensure_ascii=False)
print(f\"   {len(av['nodes'])} nodos, versión {w.get('activeVersionId')}\")
"

echo "✅ Exportado a n8n/workflow.json"
echo "⚠️  Las credenciales NO viajan en el export. Nunca importes este archivo"
echo "   completo sobre el workflow vivo — ver ./n8n/import.sh."
