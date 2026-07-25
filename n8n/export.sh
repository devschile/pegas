#!/bin/bash
# Exporta el workflow de n8n al repositorio
# Requiere: n8n-cli instalado y configurado
# Uso: ./n8n/export.sh [workflow-id]

set -euo pipefail

WORKFLOW_ID="${1:-}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "$WORKFLOW_ID" ]; then
  echo "🔍 Buscando workflow 'pega-devschile' en n8n..."
  WORKFLOW_ID=$(n8n-cli workflow list --name="pega-devschile" --jq '.[0].id' 2>/dev/null)
  if [ -z "$WORKFLOW_ID" ]; then
    echo "❌ No se encontró el workflow. Pasa el ID como argumento:"
    echo "   $0 <workflow-id>"
    echo ""
    echo "Workflows disponibles:"
    n8n-cli workflow list
    exit 1
  fi
fi

echo "📤 Exportando workflow $WORKFLOW_ID..."
n8n-cli workflow get "$WORKFLOW_ID" --json > "$REPO_DIR/n8n/workflow.json"

echo "✅ Workflow exportado a n8n/workflow.json"
