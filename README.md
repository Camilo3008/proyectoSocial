# AgroPrecios

PWA que **recopila y muestra precios de referencia** de café, plátano, banano, cacao y pitaya (locales, nacionales e internacionales), pensada para los productores de la vereda Charguayaco (Pitalito, Huila): liviana y **funcional sin conexión**.

- Especificación funcional y técnica: [`docs/PROYECTO.md`](docs/PROYECTO.md)
- Reglas de implementación: [`CLAUDE.md`](CLAUDE.md)
- Fichas de fuentes de datos: [`docs/fuentes/`](docs/fuentes/)

> Estado: **Etapa 3 (Internacional)** terminada: precios internacionales del Banco Mundial (café, cacao y banano) comparados con el precio nacional. Fase 1: solo recopilar y mostrar datos.

## Estructura

```
apps/api         API NestJS + TypeORM + PostgreSQL
apps/web         PWA Angular
packages/shared  Tipos compartidos API <-> web (solo interfaces)
docs/            Especificación y fichas de fuentes
docker/          Scripts de inicialización de PostgreSQL
```

## Requisitos

| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | 24 LTS (`>= 24.15`) | Ver `.nvmrc`. Con nvm-windows: `nvm install 24 && nvm use 24` |
| npm | 11 o superior | Viene con Node |
| Docker Desktop | Con Docker Compose v2 | Solo para PostgreSQL local |
| Git | Cualquiera reciente | |

No hace falta instalar CLIs globales: los scripts usan las versiones locales de Nest y Angular.

## Puesta en marcha local (paso a paso)

```bash
# 1. Variables de entorno: copiar el ejemplo y cambiar las claves
cp .env.example .env            # PowerShell: Copy-Item .env.example .env

# 2. Base de datos (PostgreSQL 17; crea también la base de pruebas)
docker compose up -d db
docker compose ps               # esperar a que diga (healthy)

# 3. Dependencias (también compila packages/shared)
npm install

# 4. Esquema y datos de catálogo
npm run migration:run -w apps/api
npm run seed -w apps/api

# 5. API  ->  http://localhost:3000/api   (docs: http://localhost:3000/api/docs)
npm run start:dev -w apps/api

# 6. Web (otra terminal)  ->  http://localhost:4200   (proxy /api -> :3000)
npm run start -w apps/web
```

Comprobación rápida:

- `http://localhost:3000/api/salud` → `{"estado":"ok", ...}`
- `http://localhost:3000/api/productos` → 5 productos
- `http://localhost:4200/fuentes` → la página Fuentes con los datos de la base

> El service worker (modo offline) **solo funciona en el build de producción**: `npm run build -w apps/web` y servir `apps/web/dist/web/browser` con cualquier servidor estático que haga proxy de `/api`.

## Comandos principales

Desde la raíz:

| Comando | Qué hace |
|---|---|
| `npm run lint` | ESLint en shared, api y web |
| `npm run test` | Pruebas unitarias de api y web |
| `npm run build` | Build de shared, api y web (incluye verificación de 200 kB gzip) |
| `npm run format` / `format:check` | Prettier |

API (`-w apps/api`):

| Comando | Qué hace |
|---|---|
| `start:dev` | API en modo watch |
| `test` / `test:e2e` | Unitarias / e2e (usan la base `DB_NAME_TEST`, que se reinicia en cada corrida) |
| `migration:generate -- src/database/migrations/<Nombre>` | Genera una migración comparando entidades vs. base. **Revisarla** y agregarla a `src/database/migraciones.ts` |
| `migration:run` / `migration:revert` | Aplica / revierte migraciones |
| `seed` | Siembra productos, fuentes, países y el admin (idempotente) |

Web (`-w apps/web`): `start`, `build`, `test`, `lint`.

## Tareas del administrador

Mientras se construye el panel de administración (Etapa 5), estas tareas se hacen desde **Swagger** en `http://localhost:3000/api/docs`:

1. **Iniciar sesión:** `POST /api/auth/login` con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Copiar el `accessToken`, pulsar **Authorize** y pegarlo. El token dura 15 minutos.
2. **Cargar el precio del café del día** (boletín de la FNC): `POST /api/admin/precios` con

   ```json
   {
     "producto": "cafe",
     "fuente": "fnc",
     "fecha": "AAAA-MM-DD",
     "presentacion": "pergamino seco",
     "valor": "PRECIO_POR_CARGA_SIN_PUNTOS",
     "moneda": "COP",
     "unidad": "carga 125 kg",
     "referencia": "Boletín FNC del DD/MM/AAAA"
   }
   ```

   Para el cierre de Nueva York: `"presentacion": "verde arábica (contrato C)"`, `"moneda": "USD"`, `"unidad": "USc/lb"` y `"mercadoId"` de la Bolsa de Nueva York (ICE). Los valores llevan **punto decimal** (`278.65`), nunca puntos de miles.
3. **Corregir un precio:** `PATCH /api/admin/precios/{id}/anular` con un `motivo` y volver a cargarlo. El valor anterior queda en el historial.
4. **Actualizar la TRM a mano:** `POST /api/admin/ingesta/trm`. Se ejecuta sola según `TRM_CRON` (07:30 y 18:30 por defecto) si `INGESTA_PROGRAMADA=true`.
4. **Precios mayoristas (SIPSA):** `POST /api/admin/ingesta/sipsa`. Cada consulta descarga ~316 MB del DANE y tarda ~2 minutos. Se ejecuta sola según `SIPSA_CRON` (15:30 de lunes a sábado) y guarda los últimos `SIPSA_DIAS_VENTANA` días (45). **Primera vez:** cargar el histórico con `POST /api/admin/ingesta/sipsa?desde=2020-01-01`.
4. **Precios internacionales (Banco Mundial):** `POST /api/admin/ingesta/worldbank` (~0,6 MB, segundos). Se ejecuta sola según `WORLDBANK_CRON` (lunes 9:00). Si la URL cambió, la bitácora lo advierte: actualizar `WORLDBANK_URL`.
4. **Primera vez, TRM completa:** `POST /api/admin/ingesta/trm?desde=1990-01-01` (para convertir a pesos el histórico desde 1991) y luego volver a ejecutar la ingesta del Banco Mundial.
5. **Revisar la bitácora:** `GET /api/admin/ingestas`.

> El precio de la FNC solo se puede cargar a mano: sus términos de uso no permiten la extracción automática (ver [`docs/fuentes/fnc.md`](docs/fuentes/fnc.md)).

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example). La API las valida al arrancar y no inicia si falta alguna obligatoria. **Nunca subas `.env`**.

## Integración continua

`.github/workflows/ci.yml` ejecuta lint, pruebas (unitarias y e2e con PostgreSQL) y build de api y web en cada push a `main` y en cada pull request.

## Aviso

Los precios son de referencia y provienen de fuentes públicas. No constituyen una oferta de compra ni una asesoría financiera.
