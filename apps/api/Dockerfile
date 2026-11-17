# syntax=docker/dockerfile:1
# Imagen de producción de la API. Contexto de construcción: la raíz del repo.
#   docker build -f apps/api/Dockerfile -t agroprecios-api .

FROM node:24-alpine AS base
WORKDIR /app

# --- Dependencias (todas, para compilar) ---
FROM base AS deps
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# postinstall compila packages/shared (por eso se copió completo arriba).
RUN npm ci -w packages/shared -w apps/api --include-workspace-root

# --- Compilación ---
FROM deps AS build
COPY apps/api apps/api
RUN npm run build -w apps/api

# --- Solo dependencias de producción ---
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev --ignore-scripts && npm cache clean --force

# --- Ejecución ---
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    TZ=America/Bogota
WORKDIR /app
COPY --from=prod-deps /app/package.json ./
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/salud || exit 1
# Migraciones y seeds (una vez por despliegue):
#   docker compose -f docker-compose.prod.yml run --rm api npm run migration:run:prod
#   docker compose -f docker-compose.prod.yml run --rm api npm run seed:prod
CMD ["node", "dist/main.js"]
