FROM nginx:alpine
COPY index.html css/ js/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
# data.json se genera por separado (n8n/cron) y se monta como volumen
RUN mkdir -p /usr/share/nginx/html/data
RUN echo '{"total":0,"fuentes":[],"categorias":[],"actualizado":"","pegas":[]}' > /usr/share/nginx/html/data/data.json
