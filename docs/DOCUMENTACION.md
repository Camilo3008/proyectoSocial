# AgroPrecios: documentación general

> Estado al 16 de noviembre de 2026 (Fase 1, solo datos). Documento de
> referencia para el equipo del proyecto, el tutor de la UNAD y quien opere o
> continúe el sistema. La especificación detallada y el registro de decisiones
> están en `docs/PROYECTO.md`; lo pendiente, en `docs/PENDIENTES.md`.

## 1. Qué es y para quién

AgroPrecios es una aplicación web instalable en el celular (PWA) que **recopila
automáticamente y muestra precios** de café, plátano, banano y cacao (la pitaya
está pendiente de fuente). Muestra precios locales y regionales, nacionales e
internacionales, con un **globo terráqueo** del precio al productor por país.

El primer usuario son los productores de la **vereda Charguayaco (Pitalito,
Huila)**, donde la señal es mala. Por eso la app es **liviana** (≈ 103 kB
comprimidos al abrir) y **funciona sin conexión** con los últimos datos
descargados, avisando de qué fecha son.

Lo que **no** hace en esta fase: no compra ni vende, no registra campesinos ni
compradores, no envía notificaciones ni maneja pagos (Fase 2 o posterior).

## 2. De dónde salen los datos

Cada fuente se verificó antes de integrarla. Su ficha completa (URL, formato,
licencia, ejemplo real y códigos) está en `docs/fuentes/<slug>.md`. **No hay
datos inventados**: los únicos valores de ejemplo están en pruebas y semillas,
marcados `// DATO DE EJEMPLO`.

| Fuente | Qué aporta | Entidad | Formato y acceso | Licencia / uso | Ficha |
|---|---|---|---|---|---|
| **TRM** | Dólar oficial diario, para convertir a pesos | Superintendencia Financiera (datos.gov.co, dataset `32sa-8pi3`) | JSON (API Socrata), sin token | CC BY-SA 4.0, con atribución | `trm.md` |
| **FNC** | Precio interno de referencia del café pergamino seco (por carga de 125 kg) | Federación Nacional de Cafeteros | Boletín diario en PDF | Sus términos **prohíben la extracción automatizada**: se carga **a mano** desde `/admin`. Falta autorización escrita para publicarlo | `fnc.md` |
| **SIPSA** | Precios mayoristas diarios de plátano hartón (35), plátano guineo (34) y banano (15) en las centrales de abasto; referencia del Huila: **Neiva, Surabastos** | DANE | Servicio web SOAP oficial; cada consulta devuelve todo el histórico (~316 MB), procesado en streaming | Datos públicos con **cita obligatoria del DANE** | `sipsa.md` |
| **Banco Mundial (Pink Sheet)** | Precios internacionales mensuales: café arábica y robusta, cacao, banano (EE. UU. y Europa) | Banco Mundial | XLSX mensual (~0,6 MB) | CC BY 4.0; no se puede insinuar que el Banco Mundial avala la app | `worldbank.md` |
| **FAOSTAT** | Precio anual al productor por país (globo): café, cacao, banano y plátano, 1991–2024 | FAO | ZIP masivo (~12 MB, CSV de ~214 MB leído en streaming) | CC BY 4.0 con **formato de cita obligatorio de la FAO** | `faostat.md` |
| **Natural Earth** | Fronteras de países para el globo | Natural Earth | GeoJSON 1:110 m, v5.1.2, servido por la propia app | Dominio público | `naturalearth.md` |

Cada vista muestra la **fuente y la fecha** del dato, y la cita que exige cada
licencia (por ejemplo "FAO. 2026. FAOSTAT: Precios al productor. Consultado
el… Licencia: CC-BY-4.0").

### 2.1 Advertencias de comparabilidad (se muestran en la app)

- El café de la FNC es **pergamino seco**; el de la bolsa de Nueva York y el del
  Banco Mundial es **café verde** en puerto. **Nunca se convierte uno en otro**;
  solo se comparan como tendencia.
- SIPSA es precio **mayorista** en central de abastos, no precio en finca.
- El banano del Banco Mundial es precio de **importación** (EE. UU./Europa).
- FAOSTAT es precio **al productor**, promedio anual, con ~2 años de rezago y
  cobertura parcial (unos 15 a 35 países por producto y año). Algunos valores
  extremos son oficiales y reales (café de EE. UU. = Hawái; España = Canarias).

## 3. Cada cuánto se consultan las fuentes

Los horarios están en la zona **America/Bogota** y son **configurables sin
cambiar código** (variables `*_CRON` en `.env`). En desarrollo pueden apagarse
con `INGESTA_PROGRAMADA=false`. Cualquier fuente se puede ejecutar a mano desde
`/admin` o con `POST /api/admin/ingesta/:fuente`.

| Fuente | Horario actual | Por qué | Qué guarda en cada ejecución |
|---|---|---|---|
| TRM | 7:30 a. m. y 6:30 p. m., todos los días (`TRM_CRON=0 30 7,18 * * *`) | La TRM del día siguiente se publica en la tarde | Últimos 40 registros (el histórico desde 1991 se cargó una vez con `?desde=`) |
| SIPSA | 3:30 p. m., lunes a sábado (`SIPSA_CRON=0 30 15 * * 1-6`) | El DANE actualiza hacia las 2:00 p. m. | Ventana de los últimos 45 días (`SIPSA_DIAS_VENTANA`). **Descarga ~316 MB cada vez** (aceptado provisionalmente para la demo) |
| Banco Mundial | Lunes 9:00 a. m. (`WORLDBANK_CRON=0 0 9 * * 1`) | El archivo se actualiza a comienzos de cada mes | Toda la serie mensual (desde 1960) |
| FAOSTAT | Día 1 de cada mes, 10:00 a. m. (`FAOSTAT_CRON=0 0 10 1 * *`) | Publica una o pocas veces al año | Toda la serie anual por país |
| FNC | A mano, cada día hábil | Términos de uso | Lo que digite el administrador |

Reglas de toda ingesta (CLAUDE.md):

- **Una sola descarga por fuente y por ejecución**, con un `User-Agent`
  identificable, respetando términos y `robots.txt`.
- **Idempotente:** si se repite, no duplica datos. Solo actualiza un valor si
  cambió.
- **Aislada:** cada ejecución va en su propia transacción. Si una fuente falla,
  no afecta a las demás ni deja datos a medias.
- **Trazable:** cada ejecución queda en la bitácora `ingesta_ejecucion` con su
  estado, sus conteos (leídos, nuevos, actualizados, mercados nuevos), el error
  y el hash del archivo descargado.
- Se guarda el **valor original** (moneda, unidad y presentación de la fuente)
  y, como campos derivados, **COP/kg y USD/kg** (con la TRM del día, o su
  promedio del mes o del año para series mensuales y anuales).

### 3.1 Estado de cada fuente

`/api/fuentes`, la página **Fuentes** y `/api/salud` calculan el estado a partir
de la última ingesta exitosa:

| Estado | Significado |
|---|---|
| `AL_DIA` | Última ingesta exitosa dentro de lo esperado (diaria 4 días, semanal 10, mensual 45, anual 400) |
| `ATRASADA` | Más antigua de lo esperado |
| `ERROR` | La última ejecución falló |
| `SIN_DATOS` | Nunca ha tenido una ingesta exitosa |
| `NO_APLICA` | Fuente de carga manual sin calendario |

### 3.2 Qué tan frescos llegan los datos al celular

- La API responde con `Cache-Control` (5 minutos y revalidación) y `ETag`.
- El service worker pide primero a la red y, si no responde en **4 segundos**,
  usa lo guardado: hasta **7 días** para el precio del día y **30 días** para
  las series.
- La app avisa "Sin conexión · datos de hace X" o "Conexión lenta · mostrando
  datos de hace X".

## 4. Cómo está construido

```
apps/web (Angular PWA) ──/api──► apps/api (NestJS) ──► PostgreSQL 17
                                     │
                                     └── ingesta/adapters: trm, sipsa, worldbank, faostat (FNC: manual)
packages/shared: tipos de la API compartidos (sin lógica)
```

| Capa | Tecnología |
|---|---|
| Backend | Node 24, NestJS 12, TypeORM, PostgreSQL 17 (migraciones revisadas a mano, nunca `synchronize`) |
| Frontend | Angular 22 (standalone, signals, zoneless), service worker de Angular |
| Globo | MapLibre GL 6 (proyección `globe`), cargado solo al abrir "Mundo" |
| Gráficas | Chart.js, cargado bajo demanda |
| Despliegue | Docker Compose + Caddy (HTTPS automático); ver `docs/DESPLIEGUE.md` |

Pantallas: **Hoy**, **Histórico**, **Mundo** (internacional + globo),
**Fuentes**, **Nacional** (desde Histórico) y **Administración** (`/admin`,
oculta). Accesibilidad: letra mínima de 16 px, botones de 48 px, alto contraste,
tablas alternativas a cada gráfica y al globo, sin animaciones si el equipo pide
movimiento reducido.

### 4.1 API pública (solo lectura)

Documentación interactiva en `/api/docs` (Swagger).

| Endpoint | Para qué |
|---|---|
| `GET /api/salud` | Estado de la API, la base de datos y cada fuente |
| `GET /api/productos`, `/api/mercados`, `/api/fuentes` | Catálogo y transparencia |
| `GET /api/precios/hoy` | Precio más reciente por producto, con variación |
| `GET /api/precios/series`, `/api/precios/serie` | Series disponibles e histórico |
| `GET /api/precios/comparativo` | Mismo producto en varios mercados mayoristas |
| `GET /api/internacional/commodities` | Series mensuales del Banco Mundial y referencia nacional |
| `GET /api/internacional/paises`, `/paises/:iso3` | Precio al productor por país (globo) y detalle |
| `GET /api/tasas/trm` | Serie de la TRM |

Administración (JWT, único rol `ADMIN`): `POST /api/auth/login`,
`POST /api/admin/ingesta/:fuente`, `GET /api/admin/ingestas`,
`GET|POST /api/admin/precios`, `PATCH /api/admin/precios/:id/anular`. Un precio
nunca se borra: se **anula con motivo** y el valor anterior queda en el
historial.

## 5. Operación diaria

1. **Cada día hábil:** el administrador entra a `/admin` y carga el precio del
   café de la FNC (valor original por carga de 125 kg, con la referencia del
   boletín).
2. **Revisar** en `/admin` o en **Fuentes** que ninguna fuente esté en `ERROR`
   o `ATRASADA`. Si lo está, ver el error en la bitácora y ejecutar de nuevo.
3. Si se digitó mal un precio: **Anular** con motivo y volver a cargarlo.
4. Respaldos automáticos diarios; copiarlos fuera del servidor (ver
   `docs/DESPLIEGUE.md`).

## 6. Calidad y verificación

- **API:** 67 pruebas unitarias (cada adapter con **fixtures reales** guardados,
  sin red) y 56 e2e contra una base de datos de pruebas.
- **Web:** 56 pruebas de servicios y componentes (tarjeta de precio, formato
  es-CO, estado sin conexión, globo/tabla, panel de administración).
- **Presupuesto de rendimiento:** el build falla si el bundle inicial supera
  200 kB gzip (hoy ≈ 103 kB). MapLibre con su worker (≈ 395 kB) y Chart.js
  (≈ 61 kB) solo se descargan cuando se usan.
- **Stack de producción probado en local** (Docker + Caddy + CSP): imágenes,
  migraciones, semillas, ingestas y globo verificados el 16-11-2026.
- Integración continua en GitHub Actions (`.github/workflows/ci.yml`): lint,
  pruebas y build.

## 7. Documentos relacionados

| Documento | Contenido |
|---|---|
| `README.md` | Puesta en marcha local, comandos y tareas del administrador |
| `docs/PROYECTO.md` | Especificación, modelo de datos, roadmap y registro de decisiones |
| `docs/fuentes/` | Fichas verificadas de cada fuente |
| `docs/DESPLIEGUE.md` | Producción con Docker, HTTPS, respaldos y monitoreo |
| `docs/GUIA-USUARIO.md` | Guía de uso para la capacitación |
| `docs/ENCUESTA.md` | Plantilla de encuesta de uso y utilidad |
| `docs/solicitudes/solicitud-autorizacion-fnc.md` | Borrador de carta a la FNC |
| `docs/ANALISIS-MODULOS.md` | Ventajas, desventajas y riesgos de cada módulo |
| `docs/PENDIENTES.md` | Pendientes y puntos que requieren revisión |
