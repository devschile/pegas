#!/bin/sh
set -e

echo "[entrypoint] Initializing database schema..."
cd /app
# Fatal a proposito: con migraciones reales (no solo CREATE TABLE IF NOT
# EXISTS) arrancar la app contra un esquema a medio migrar es peor que no
# arrancar.
node scripts/init-db.js

echo "[entrypoint] Seeding initial data..."
node scripts/seed.js 2>&1 || echo "[entrypoint] WARNING: seed failed"

echo "[entrypoint] Generating data.json..."
node scripts/generate-json.js /usr/share/nginx/html/data/data.json 2>&1 || {
    echo "[entrypoint] WARNING: generate-json failed, using empty data.json"
    mkdir -p /usr/share/nginx/html/data
    echo '{"total":0,"fuentes":[],"categorias":[],"actualizado":"","pegas":[]}' > /usr/share/nginx/html/data/data.json
}

# Los assets se sirven con cache larga e immutable, asi que el navegador no
# revalida nunca. Para que un deploy sea visible al instante, se les agrega
# ?v=<hash del contenido>: si el archivo cambia, cambia la URL y el cache
# (navegador y CDN) falla por URL nueva. El patron tolera un ?v= previo, asi
# que es idempotente si el entrypoint corre de nuevo sobre el mismo disco.
WEB=/usr/share/nginx/html
ASSET_VER=$(cat "$WEB/app.js" "$WEB/style.css" | md5sum | cut -c1-8)
echo "[entrypoint] Versionando assets: v=$ASSET_VER"
sed -i -E \
  -e "s#(src=\"app\.js)[^\"]*\"#\1?v=$ASSET_VER\"#" \
  -e "s#(href=\"style\.css)[^\"]*\"#\1?v=$ASSET_VER\"#" \
  "$WEB/index.html"

echo "[entrypoint] Starting nginx..."
exec "$@"
