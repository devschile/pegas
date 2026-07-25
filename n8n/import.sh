#!/bin/bash
# Importa el workflow desde el repositorio a n8n
# Requiere: n8n-cli instalado y configurado
# Uso: ./n8n/import.sh [--activate]

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKFLOW_FILE="$REPO_DIR/n8n/workflow.json"
ACTIVATE=false

if [ "${1:-}" = "--activate" ]; then
  ACTIVATE=true
fi

if [ ! -f "$WORKFLOW_FILE" ]; then
  echo "❌ No se encontró $WORKFLOW_FILE"
  exit 1
fi

echo "🔍 Buscando workflow existente 'pega-devschile'..."
EXISTING_ID=$(n8n-cli workflow list --name="pega-devschile" --jq '.[0].id' 2>/dev/null || echo "")

if [ -n "$EXISTING_ID" ]; then
  echo "📝 Actualizando workflow existente ($EXISTING_ID)..."
  n8n-cli workflow update "$EXISTING_ID" --file="$WORKFLOW_FILE"
  
  if $ACTIVATE; then
    n8n-cli workflow activate "$EXISTING_ID"
  fi
  echo "✅ Workflow actualizado"
else
  echo "📥 Creando nuevo workflow..."
  NEW_ID=$(n8n-cli workflow create --file="$WORKFLOW_FILE" --jq '.id')
  
  if $ACTIVATE; then
    n8n-cli workflow activate "$NEW_ID"
  fi
  echo "✅ Workflow creado: $NEW_ID"
fi
