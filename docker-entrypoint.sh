#!/bin/sh
set -e

# Generate data.json from PostgreSQL
echo "[entrypoint] Generating data.json from PostgreSQL..."
cd /app
node scripts/generate-json.js /usr/share/nginx/html/data/data.json 2>&1 || {
    echo "[entrypoint] WARNING: generate-json.js failed, using empty data.json"
    echo '{"total":0,"fuentes":[],"categorias":[],"actualizado":"","pegas":[]}' > /usr/share/nginx/html/data/data.json
}
echo "[entrypoint] Starting nginx..."
exec "$@"
