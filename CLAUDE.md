# CLAUDE.md — AgroPrecios

> Nombre de trabajo: **AgroPrecios**. Si el nombre cambia, actualizar aquí y en `docs/PROYECTO.md`.

## Qué es este proyecto

Una PWA que **recopila y muestra precios de productos agrícolas**: café, plátano/banano, cacao y pitaya. Muestra precios locales (Pitalito, Huila), nacionales e internacionales. La vista internacional incluye un **globo terráqueo interactivo**.

El primer usuario son los campesinos de la vereda Charguayaco. Allí la conectividad es mala. Esto impone dos condiciones: **la app tiene que ser liviana y seguir funcionando offline con los últimos datos descargados.**

La especificación completa (objetivos, alcance, fuentes de datos, modelo, API, roadmap) está en **`docs/PROYECTO.md`**. Léela antes de implementar cualquier funcionalidad nueva.

### Alcance actual: Fase 1 (solo datos)
- ✅ Ingesta automática y manual de precios desde fuentes externas.
- ✅ Consulta y visualización: precio del día, históricos, comparativos y globo internacional.
- ✅ Un solo rol autenticado: `ADMIN`, para la carga manual y para disparar ingestas.
- ❌ **NO implementar** en esta fase: registro de comercios o compradores, reseñas, registro de campesinos, notificaciones ni pagos. Todo eso es Fase 2 o posterior. Si una tarea lo pide, detente y pregunta.

## Stack (100 % TypeScript)

| Capa | Tecnología |
|---|---|
| Backend | NestJS + TypeORM + PostgreSQL |
| Frontend | Angular (standalone components, signals, nuevo control flow `@if/@for`) + `@angular/pwa` |
| Mapa / globo | MapLibre GL JS v5+ con `projection: { type: 'globe' }` + GeoJSON de países (Natural Earth) |
| Gráficas | Chart.js (importar solo los módulos usados) |
| Tipos compartidos | `packages/shared` (interfaces y DTOs de la API, sin lógica) |
| Infra local | Docker Compose (PostgreSQL) |

No agregues librerías de UI pesadas (Angular Material, PrimeNG, Bootstrap) ni frameworks de estado (NgRx) sin consultarlo antes. Usa SCSS con variables CSS y signals.

## Estructura del repositorio

```
/
├── CLAUDE.md
├── docker-compose.yml
├── package.json              # npm workspaces
├── docs/
│   ├── PROYECTO.md           # especificación funcional y técnica
│   └── fuentes/              # una ficha .md por fuente de datos verificada
├── packages/shared/src/      # interfaces compartidas API <-> web
├── apps/api/                 # NestJS
│   └── src/
│       ├── config/           # @nestjs/config + validación de env
│       ├── database/         # data-source.ts, migrations/, seeds/
│       ├── catalogo/         # productos, fuentes, mercados, países
│       ├── precios/          # observaciones de precio + consultas
│       ├── internacional/    # series de commodities + datos por país
│       ├── tasas/            # TRM y conversión de monedas
│       ├── ingesta/          # adapters por fuente + scheduler + bitácora
│       │   └── adapters/     # fnc.adapter.ts, sipsa.adapter.ts, worldbank.adapter.ts, faostat.adapter.ts, trm.adapter.ts
│       ├── auth/             # JWT, solo ADMIN
│       └── common/           # filtros, interceptores, pipes, utilidades
└── apps/web/                 # Angular
    └── src/app/
        ├── core/             # servicios API, interceptores, formato es-CO
        ├── shared/           # componentes UI reutilizables
        └── features/
            ├── hoy/          # inicio: precio del día por producto
            ├── historico/    # series y gráficas
            ├── nacional/     # comparación por mercado mayorista
            ├── internacional/# globo + series de bolsa
            ├── fuentes/      # transparencia: fuentes y última actualización
            └── admin/        # carga manual (lazy, protegido)
```

## Comandos

```bash
docker compose up -d db                    # PostgreSQL local
npm install                                # en la raíz (workspaces)

# API
npm run start:dev -w apps/api
npm run test -w apps/api
npm run lint -w apps/api
npm run migration:generate -w apps/api -- src/database/migrations/<Nombre>
npm run migration:run -w apps/api
npm run seed -w apps/api

# Web
npm run start -w apps/web                  # proxy /api -> http://localhost:3000
npm run build -w apps/web                  # build de producción (SW solo funciona en build)
npm run test -w apps/web
npm run lint -w apps/web
```

Si un script no existe todavía, créalo en el `package.json` correspondiente en vez de ejecutar comandos sueltos.

## Convenciones

### Idioma y nombres
- **El dominio va en español** (entidades, servicios, rutas de API, textos de UI): `Producto`, `ObservacionPrecio`, `GET /api/precios/hoy`.
- **Los identificadores no llevan tildes ni ñ**: `anio`, `presentacion`, `pais`.
- Los términos técnicos del framework se quedan en inglés (`controller`, `module`, `guard`, `adapter`).
- Los comentarios, los mensajes de commit y la documentación van en español.
- Commits con Conventional Commits: `feat(ingesta): adapter SIPSA`.

### Backend (NestJS + TypeORM)
- **Nunca uses `synchronize: true`.** Todo cambio de esquema se hace con una migración generada y revisada.
- **Los montos se guardan como `numeric(18,4)`** y viajan como `string` en la entidad. Para hacer cálculos usa una utilidad decimal; no uses `number` para dinero.
- Las fechas de observación son `date`; los timestamps son `timestamptz`. La zona de negocio es `America/Bogota`.
- Valida cada DTO con `class-validator`. Activa `ValidationPipe` global con `whitelist` y `forbidNonWhitelisted`.
- Documenta toda la API pública con `@nestjs/swagger` en `/api/docs`.
- Usa `helmet`, `@nestjs/throttler` y CORS restringido al origen del frontend.
- Las respuestas de lectura llevan `Cache-Control` y `ETag`. Los datos cambian como máximo una vez al día.
- Lee las variables de entorno solo a través de `ConfigService` y valídalas al arrancar. Mantén `.env.example` al día y no subas nunca `.env`.

### Ingesta de datos (crítico)
- Cada fuente es un **adapter** que implementa `FuenteAdapter`, definido en `ingesta/adapters/fuente-adapter.interface.ts`. Un adapter descarga, parsea y devuelve `ObservacionPrecioCruda[]`, y no toca la base de datos.
- El `IngestaService` normaliza los datos, hace upsert **idempotente** (con la clave única definida en `docs/PROYECTO.md`) y registra cada ejecución en `ingesta_ejecucion`: estado, conteo, error y hash del payload.
- Los jobs se programan con `@nestjs/schedule`. Cada job también se puede disparar a mano con `POST /api/admin/ingesta/:fuente`.
- Un fallo en una fuente **no puede tumbar las demás** ni dejar datos parciales. Cada ejecución va en su propia transacción.
- **No inventes endpoints, URLs, códigos de producto ni formatos de archivo.** Antes de escribir un adapter, verifica la fuente real y documéntala en `docs/fuentes/<slug>.md`: URL, formato, frecuencia, licencia, ejemplo de respuesta y códigos de producto. Si no puedes verificarla, deja el adapter como stub con `TODO(verificar)` y avisa.
- Respeta los términos de uso y el `robots.txt` de cada sitio. Hay como máximo una descarga por fuente y por ejecución, con un `User-Agent` identificable.
- Guarda siempre el **valor original** (moneda, unidad y presentación de la fuente). La conversión a COP/kg es un campo derivado. **No conviertas entre presentaciones distintas** (café pergamino seco ≠ café excelso ≠ café en bolsa).

### Frontend (Angular PWA)
- Usa solo standalone components con `ChangeDetectionStrategy.OnPush` y signals. Las rutas por feature se cargan con lazy loading.
- **El globo (MapLibre) se carga de forma diferida** con `import()` dinámico, solo al entrar a `/internacional`. Nunca debe entrar en el bundle inicial.
- **Presupuesto de rendimiento:** el bundle inicial debe pesar menos de 200 kB gzip. Configúralo en `angular.json` → `budgets`; el build debe fallar si se excede.
- Configura el service worker (`ngsw-config.json`) así:
  - `assetGroups`: el shell de la app en modo `prefetch`, y las fuentes tipográficas y el GeoJSON de países en modo `lazy`.
  - `dataGroups` para `/api/**` de lectura: estrategia `freshness` con timeout corto (unos 4 s) y caché de varios días, para que funcione offline.
- Toda vista de datos muestra **la fuente y la fecha del dato** ("Fuente: FNC · 14 nov 2026"). Si los datos vienen de caché offline, muestra un aviso visible del tipo "Sin conexión · datos de hace X".
- Formatea números y fechas con locale `es-CO` (registra `localeEs` / `es-CO`). Los precios en COP van sin decimales.
- La interfaz es **limpia y móvil primero**: tipografía legible (mínimo 16 px), alto contraste, objetivos táctiles de al menos 44 px y nada de animaciones innecesarias. Accesibilidad AA.
- El globo debe ofrecer una vista alternativa en **lista o tabla** con los mismos datos, para equipos sin WebGL o de gama baja (detecta la falla de WebGL y cambia automáticamente).

### Tests
- API: pruebas unitarias de cada adapter con **fixtures reales guardados** en `test/fixtures/<fuente>/`, sin llamadas a red. Pruebas e2e de los endpoints públicos contra una base de datos de pruebas.
- Web: pruebas de servicios y de componentes clave (tarjeta de precio, formateo y estado offline).

## Forma de trabajar (para Claude Code)

1. Antes de una tarea que no sea trivial, lee `docs/PROYECTO.md` y propón un plan breve. Si la tarea toca el esquema de la base de datos, la API pública o una fuente nueva, espera confirmación.
2. Trabaja en incrementos pequeños y verificables. Al terminar cada uno, ejecuta lint, tests y build de la app afectada y reporta el resultado.
3. Si una decisión de este archivo choca con la tarea, pregunta. No la ignores en silencio.
4. Cuando cambies una convención o tomes una decisión de arquitectura, regístrala en `docs/PROYECTO.md`, sección "Registro de decisiones".
5. No agregues dependencias sin justificarlas en una línea (para qué sirve y cuánto pesa en el frontend).
6. No incluyas datos de precios inventados en el código, salvo en fixtures y seeds marcados como `// DATO DE EJEMPLO`.
