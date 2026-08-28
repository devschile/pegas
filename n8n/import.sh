#!/bin/bash
# Prepara la actualización de los nodos Code del workflow en n8n.
#
# NO importa el workflow completo, a propósito. Hacerlo rompe producción de dos
# formas comprobadas el 26/8/2026:
#
#   1. Las credenciales no viajan en n8n/workflow.json, así que un import deja
#      los 10 nodos que las usan (Gmail, 6 Postgres, 3 Slack) sin credencial:
#      "10 nodes have issues, fix them before publishing".
#   2. n8n importa AGREGANDO nodos al canvas, no reemplazando. Importar sobre
#      el workflow equivocado le sumó 30 nodos a uno de 8 y encima lo renombró,
#      porque el import también pisa el campo "name".
#
# Lo único que cambia entre el repo y n8n es el código de los nodos Code, y eso
# se pega a mano: editar un nodo Code no toca credenciales ni nodos vecinos.
#
# Uso: ./n8n/import.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="$REPO_DIR/.rollback/nodos-n8n"

# El pipeline real. Se referencia por ID porque hay dos workflows con el mismo
# nombre: este (30 nodos) y rTY2yr7I2OC5Gk5W, que en realidad es "GetOnBoard:
# reintentar empleadores" y quedó mal nombrado por un import equivocado.
WORKFLOW_ID="ah2kXtL4EtNVKEGW"

node "$REPO_DIR/n8n/sync-categorizar.js" --check

mkdir -p "$DESTINO"
python3 - "$REPO_DIR" "$DESTINO" <<'PY'
import json, re, sys, os
repo, destino = sys.argv[1], sys.argv[2]
d = json.load(open(os.path.join(repo, 'n8n/workflow.json')))

# Nodos Code que no tocan categorizar() pero igual se editan desde el repo.
# Sin esta lista el script los ignora en silencio y el cambio nunca llega a
# n8n -- que es como el digest quedo un tiempo distinto en repo y produccion.
EXTRA = {'Agrupar notificación', 'Armar hilo de detalle'}

n = 0
for nodo in d['nodes']:
    code = nodo.get('parameters', {}).get('jsCode')
    if not code or ('categorizar' not in code and nodo['name'] not in EXTRA):
        continue
    n += 1
    slug = re.sub(r'[^a-z0-9]+', '-', nodo['name'].lower()).strip('-')
    ruta = os.path.join(destino, f'{n}-{slug}.js')
    open(ruta, 'w').write(code)
    print(f'  {n}. {nodo["name"]}')
    print(f'     {ruta}')
PY

echo
echo "Abrir https://n8n.devschile.cl/workflow/$WORKFLOW_ID"
echo "Para cada nodo: abrirlo, clic en el editor, Cmd+A, pegar el archivo encima."
echo
echo "Si un nodo de la lista todavía no existe en el canvas, hay que crearlo a"
echo "mano (los nodos nuevos no se pueden pegar): agregar un nodo Code, ponerle"
echo "exactamente ese nombre — el código de otros nodos los referencia por"
echo "nombre con \$('...') — y cablearlo como está en n8n/workflow.json."
echo
echo "Después, Publish."
