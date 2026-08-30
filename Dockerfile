FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
# satori (renderer de las og:image) usa harfbuzzjs para el shaping de texto,
# que carga un .wasm en runtime via una ruta de archivo, no un require()
# estatico -- el trazador de Nitro copia el wrapper .js de harfbuzzjs a
# .output/server/node_modules/ pero no detecta ese .wasm, asi que sin esto
# CUALQUIER og:image con texto revienta en produccion (ENOENT). No se
# reproduce corriendo `node .output/server/index.mjs` fuera de Docker: ahi
# Node cae al node_modules real del repo, que si tiene el wasm.
#
# harfbuzzjs no es dependencia directa (la trae satori), asi que en pnpm
# vive en .pnpm/ y no en node_modules/harfbuzzjs/ plano -- esta ruta esta
# atada a la version resuelta hoy. Si esto vuelve a romper con el mismo
# ENOENT tras actualizar deps, correr `find node_modules/.pnpm -iname
# hb.wasm` para encontrar la ruta nueva.
COPY --from=build /app/node_modules/.pnpm/harfbuzzjs@0.10.0/node_modules/harfbuzzjs/hb.wasm ./.output/server/node_modules/harfbuzzjs/hb.wasm
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
