# syntax=docker/dockerfile:1
# Imagen de producción de la web: build de Angular servido por Caddy (HTTPS
# automático) que además hace de proxy inverso hacia la API.
# Contexto de construcción: la raíz del repo.
#   docker build -f apps/web/Dockerfile -t agroprecios-web .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w packages/shared -w apps/web --include-workspace-root
COPY apps/web apps/web
# Incluye copiar-vendor.mjs (prebuild) y la verificación del presupuesto (< 200 kB gzip).
RUN npm run build -w apps/web

FROM caddy:2-alpine
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist/web/browser /srv
