FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --production --ignore-scripts

FROM nginx:alpine
# Install Node.js for the generate-json.js script
RUN apk add --no-cache nodejs
COPY --from=deps /app/node_modules /app/node_modules
COPY scripts/ /app/scripts/
COPY migrations/ /app/migrations/
# Solo el clasificador, no todo n8n/: scripts/reclasificar.js lo importa para
# volver a categorizar las pegas ya guardadas desde adentro del contenedor
# (la base no es alcanzable desde fuera de la red de Coolify).
COPY n8n/categorizar.js /app/n8n/categorizar.js
COPY package.json /app/
COPY index.html robots.txt sitemap.xml css/ js/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /usr/share/nginx/html/data

# Entrypoint: generate data.json from DB, then start nginx
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
