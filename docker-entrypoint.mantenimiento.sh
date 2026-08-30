#!/bin/sh
set -e

echo "[mantenimiento] Aplicando migraciones pendientes..."
# Fatal a proposito, igual que en el entrypoint que reemplaza: dejar la base
# a medio migrar es peor que no arrancar. init-db.js toma un advisory lock,
# asi que dos arranques solapados no corren la misma migracion dos veces.
node scripts/init-db.js

# seed.js NO se corre: era bootstrap de la tabla vacia en julio 2026 y hoy
# solo puede ser un no-op (se autoprotege si hay filas). generate-json.js
# tampoco: alimentaba al sitio estatico, que ya no existe.

echo "[mantenimiento] Migraciones al dia. El contenedor queda vivo como"
echo "[mantenimiento] acceso operativo a la base (psql / node scripts/*.js)."
exec tail -f /dev/null
