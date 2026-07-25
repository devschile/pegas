FROM node:22-alpine AS builder
WORKDIR /app

# Copiar dependencias primero para cache de Docker
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

# Copiar scripts y schema
COPY scripts/ ./scripts/
COPY schema.sql ./

# Inicializar BD (crea tabla si no existe) y luego generar JSON
RUN node scripts/init-db.js && node scripts/generate-json.js

# --- Production stage ---
FROM nginx:alpine
# data.json generado en build stage
COPY --from=builder /app/data/data.json /usr/share/nginx/html/data/
COPY index.html css/ js/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
