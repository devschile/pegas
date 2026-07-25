#!/bin/sh
set -e

echo "[entrypoint] Initializing database schema..."
cd /app
node scripts/init-db.js 2>&1 || echo "[entrypoint] WARNING: init-db failed"

echo "[entrypoint] Seeding initial data..."
node scripts/seed.js 2>&1 || echo "[entrypoint] WARNING: seed failed"

echo "[entrypoint] Generating data.json..."
node scripts/generate-json.js /usr/share/nginx/html/data/data.json 2>&1 || {
    echo "[entrypoint] WARNING: generate-json failed, using empty data.json"
    mkdir -p /usr/share/nginx/html/data
    echo '{"total":0,"fuentes":[],"categorias":[],"actualizado":"","pegas":[]}' > /usr/share/nginx/html/data/data.json
}

echo "[entrypoint] Starting nginx..."
exec "$@"
