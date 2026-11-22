# AgroPrecios: documentación inicial del proyecto

| | |
|---|---|
| **Autor** | Juan Camilo Álvarez Molano |
| **Versión** | 0.1 (documento inicial) |
| **Fecha** | 15 de noviembre de 2026 |
| **Estado** | Borrador para iniciar el desarrollo |
| **Origen** | Diagnóstico solidario de la vereda Charguayaco (Pitalito, Huila), Servicio Social Unadista, Fase 2 |

> Este documento es la fuente de verdad funcional y técnica del sistema. Va en `docs/PROYECTO.md` y lo complementa el archivo `CLAUDE.md` de la raíz, que contiene las reglas de implementación.

---

## 1. Contexto y problema

### 1.1 Comunidad
Charguayaco es una vereda ubicada al sur de Pitalito (Huila). Su economía depende principalmente del **café**. También se cultivan **plátano/banano, cacao y pitaya**, y para autoconsumo frijol, maíz y yuca. En la vereda hay dos compras de café, mini supermercados y otros negocios pequeños.

### 1.2 Problema identificado
Durante el mapeo de sueños y el diagnóstico solidario se identificó que **la mayoría de los campesinos no tiene acceso a información actualizada de precios** de sus cultivos, ni local, ni nacional, ni internacional. En consecuencia:
- los intermediarios y compradores tienen mayor poder de negociación;
- el campesino no sabe si el precio que le ofrecen está por encima o por debajo de la referencia del mercado;
- las decisiones de venta (cuándo, a quién y en qué presentación vender) se toman a ciegas.

### 1.3 Restricción de contexto (determina el diseño)
El mismo diagnóstico señala **mala cobertura de internet y de señal telefónica** en la vereda, y personas mayores con poca formación digital. Por eso el sistema debe:
- funcionar con conexiones lentas e intermitentes;
- guardar los últimos datos y mostrarlos **sin conexión**;
- tener una interfaz muy simple, en la que el dato importante (el precio de hoy) se vea en una sola pantalla.

---

## 2. Visión y objetivos

### 2.1 Visión
> Que cualquier productor de Charguayaco, y más adelante de cualquier vereda, pueda saber en segundos y desde el celular cuál es el precio de referencia de su cosecha hoy, cómo ha cambiado y cómo se compara con el mercado nacional e internacional.

### 2.2 Objetivo general
Desarrollar una aplicación web progresiva (PWA) que **recopile automáticamente precios de productos agrícolas desde fuentes oficiales y los presente** de forma clara, comparable y disponible sin conexión.

### 2.3 Objetivos específicos
1. **Recopilar** de forma automática y trazable los precios de café, plátano/banano, cacao y pitaya desde fuentes oficiales nacionales e internacionales.
2. **Normalizar** los datos (moneda, unidad, presentación y fecha) para poder compararlos, conservando siempre el dato original.
3. **Mostrar el precio del día** por producto, con su variación y su fuente.
4. **Mostrar el histórico** de cada producto con gráficas simples.
5. **Comparar** precios entre mercados nacionales (mayoristas) y referencias internacionales.
6. **Explorar el contexto internacional** con un globo terráqueo interactivo, en el que el usuario gira el mundo, selecciona un país y ve sus precios al productor y su relación con el producto.
7. **Funcionar offline** con los últimos datos consultados e indicar claramente su antigüedad.
8. **Ser transparente**: cada dato muestra su fuente, su fecha y su unidad, y existe una página con el estado de cada fuente.

### 2.4 Indicadores de éxito (Fase 1)
| Indicador | Meta inicial |
|---|---|
| Fuentes con ingesta automática funcionando | ≥ 3 |
| Disponibilidad del precio del café del día hábil | ≥ 95 % de los días hábiles |
| Tiempo de carga de la pantalla "Hoy" en 3G lento | < 4 s en la primera visita y < 1 s en las siguientes (caché) |
| Funciona sin conexión mostrando el último dato | Sí, verificado en la prueba de campo |
| Usuarios de la comunidad capacitados | 8 (según el plan de acción solidaria) |
| Satisfacción en encuesta posterior a la capacitación | ≥ 4/5 |

---

## 3. Alcance

### 3.1 Dentro del alcance (Fase 1: recopilar y mostrar)
- Catálogo de productos, fuentes, mercados y países.
- Ingesta automática programada y ejecución manual por el administrador.
- Carga manual de precios por el administrador, para fuentes sin API o cuando una ingesta falle.
- Bitácora de ingestas (qué se descargó, cuándo, cuántos registros y errores).
- API pública de solo lectura.
- PWA con estas vistas: **Hoy**, **Histórico**, **Nacional**, **Internacional (globo)**, **Fuentes** y **Admin**.
- Conversión de moneda con la TRM.
- Despliegue en hosting con dominio propio y HTTPS.

### 3.2 Fuera del alcance (fases posteriores)
| Funcionalidad | Fase |
|---|---|
| Registro de comercios y compradores (compras de café, intermediarios) con ubicación | 2 |
| Precios reportados por comercios locales | 2 |
| Reseñas y calificaciones de compradores, con moderación | 2 |
| Registro de usuarios campesinos y preferencias | 2 |
| Alertas de precio por WhatsApp o SMS | 3 |
| Proyecciones o predicción de precios | 3 |
| App nativa | No planeado (la PWA cubre la necesidad) |

---

## 4. Usuarios

| Perfil | Necesidad principal | Implicaciones de diseño |
|---|---|---|
| **Campesino productor** (usuario principal) | Saber el precio de hoy y si está subiendo o bajando | Pantalla "Hoy" muy simple, números grandes, lenguaje cotidiano, offline |
| **Líder comunitario** | Explicar el mercado a otros y comparar | Histórico, comparativos, compartir enlace |
| **Usuario curioso o estudiante** | Entender el mercado internacional | Globo interactivo, series de bolsa |
| **Administrador** (el autor) | Mantener los datos al día | Panel de ingestas, carga manual, bitácora |

En la Fase 1 **no hay registro de usuarios finales**: la consulta es pública y anónima. Solo el administrador se autentica.

---

## 5. Requisitos funcionales

### RF-01 Precio del día (pantalla "Hoy")
- Muestra una tarjeta por producto con: último precio de referencia, unidad y presentación, variación frente al dato anterior (▲/▼ y %), fecha y fuente.
- El café muestra el **precio interno de referencia de la FNC** (carga de 125 kg de café pergamino seco) y, como dato secundario, el cierre de la Bolsa de Nueva York y la TRM del día.
- Los demás productos muestran el precio mayorista más reciente disponible (SIPSA), priorizando el mercado más cercano a Pitalito (por ejemplo Neiva) y luego Bogotá.
- Si no hay dato del día, muestra el último disponible con su fecha resaltada.

### RF-02 Histórico
- Selector de producto, fuente o mercado y rango (7 días, 30 días, 6 meses, 1 año, máximo).
- Gráfica de línea y tabla con los datos.
- Muestra mínimo, máximo y promedio del rango.

### RF-03 Comparativo nacional
- Para un producto y una fecha, lista los mercados mayoristas con su precio, ordenados de mayor a menor.
- Permite ver la diferencia en % frente al mercado de referencia de la región.

### RF-04 Internacional: series de bolsa y referencia
- Series mensuales de precios internacionales de café arábica, café robusta, cacao y banano, en USD/kg y convertidas a COP/kg con la TRM.
- Comparación entre la referencia internacional y el precio nacional (con la advertencia de que corresponden a presentaciones distintas).

### RF-05 Internacional: globo terráqueo interactivo
- Globo 3D que se puede **girar, inclinar y acercar** con el dedo o el mouse.
- Selector de producto y de año o mes. Los países se colorean según el **precio al productor** de ese producto (mapa de coropletas), con leyenda.
- Al tocar o hacer clic en un país se abre un panel lateral (o inferior en móvil) con:
  - nombre del país y bandera (emoji o código, sin imágenes pesadas);
  - precio al productor en moneda local y en USD, unidad y año;
  - mini serie histórica de ese país;
  - comparación con Colombia ("X % más alto o bajo que en Colombia");
  - fuente y fecha.
- Los países sin dato se muestran en gris con la etiqueta "Sin datos".
- Un botón "Centrar en Colombia" y una rotación inicial lenta que se detiene al primer toque.
- **Alternativa accesible:** una vista en lista o tabla con los mismos datos, que se activa automáticamente si el equipo no soporta WebGL y que el usuario puede abrir con un botón.

### RF-06 Fuentes y transparencia
- Lista de fuentes con descripción, enlace oficial, licencia, frecuencia esperada, última ingesta exitosa y estado (al día, atrasada o con error).

### RF-07 Administración
- Inicio de sesión del administrador (JWT).
- Ejecutar manualmente la ingesta de una fuente y ver el resultado.
- Bitácora de ingestas con filtros.
- Carga manual de una observación de precio (formulario con validación) y edición o anulación con trazabilidad (quién, cuándo y motivo).

### RF-08 Offline y PWA
- Instalable en la pantalla de inicio (manifest con íconos y nombre corto).
- Sin conexión, las vistas Hoy, Histórico (rangos ya consultados) y Fuentes muestran los datos en caché con el aviso "Sin conexión · datos actualizados el …".
- El globo funciona offline con el último conjunto de datos y el GeoJSON en caché.

---

## 6. Requisitos no funcionales

| Categoría | Requisito |
|---|---|
| Rendimiento | Bundle inicial < 200 kB gzip. El globo (MapLibre) se carga de forma diferida. Respuestas de API de lectura < 300 ms (p95) con caché |
| Conectividad | Estrategia `freshness` con timeout corto y caché. Payloads compactos (paginación y campos mínimos) |
| Usabilidad | Móvil primero, tipografía ≥ 16 px, objetivos táctiles ≥ 44 px, lenguaje sencillo, cifras en formato es-CO |
| Accesibilidad | WCAG 2.1 AA. El globo tiene alternativa en tabla. Los colores de la coropleta se distinguen también para daltonismo |
| Confiabilidad | La falla de una fuente no afecta a las otras. Ingesta idempotente. Reintentos con backoff |
| Trazabilidad | Cada observación guarda su fuente, la ejecución de ingesta que la creó y el valor original |
| Seguridad | HTTPS, helmet, rate limiting, CORS restringido, JWT de corta duración para el administrador, secretos solo en variables de entorno |
| Mantenibilidad | TypeScript estricto, lint, tests de adapters con fixtures, migraciones versionadas |
| Observabilidad | Logs estructurados y un endpoint `/api/salud` con el estado de la base de datos y de cada fuente |

---

## 7. Fuentes de datos

> ⚠️ **Antes de implementar cada adapter hay que verificar la URL, el formato, los códigos de producto y la licencia vigentes**, y documentarlos en `docs/fuentes/<slug>.md`. La tabla resume lo conocido al 15/11/2026.

| Slug | Fuente | Qué aporta | Frecuencia | Acceso | Notas y pendientes |
|---|---|---|---|---|---|
| `fnc` | Federación Nacional de Cafeteros | Precio interno de referencia del café (carga de 125 kg de pergamino seco), cierre de NY (contrato C) y TRM usada | Diaria (días hábiles) | Boletín diario publicado en PDF en federaciondecafeteros.org | No se conoce una API oficial. Opción A: descargar y parsear el PDF. Opción B: carga manual diaria. **Verificar los términos de uso** |
| `sipsa` | DANE: SIPSA, componente de precios mayoristas | Precios mayoristas de alimentos por mercado (plátano, banano, pitaya, etc.) | Diaria, semanal y mensual | Servicio web **SOAP** (WSDL publicado por el DANE) | Requiere un cliente SOAP en Node (paquete `soap`). **Verificar qué artículos de interés existen** (cacao probablemente no está) y qué mercado está más cerca de Pitalito |
| `worldbank` | Banco Mundial: Commodity Price Data (*Pink Sheet*) | Precios internacionales mensuales en USD: café arábica, café robusta, cacao, banano | Mensual | Archivo Excel histórico mensual descargable | **Verificar la licencia** y la URL estable del archivo |
| `faostat` | FAO: FAOSTAT, dominio Precios al Productor | Precio al productor por país y producto (alimenta el **globo**) | Anual y mensual (cobertura parcial) | API o descarga masiva de FAOSTAT | **Verificar la licencia** (puede tener restricciones de uso comercial), la cobertura de pitaya y los códigos de ítem |
| `trm` | Superintendencia Financiera / Banco de la República (vía datos.gov.co) | TRM diaria COP/USD | Diaria | Dataset abierto | Verificar el dataset vigente |
| `manual` | Administrador | Datos que no tienen API o correcciones | A demanda | Formulario de administración | Siempre con trazabilidad |

### 7.1 Advertencias de comparabilidad (mostrarlas en la UI)
- **Café:** el precio FNC es café **pergamino seco** por carga de 125 kg; Nueva York cotiza café **verde arábica** en centavos de USD por libra; el Banco Mundial reporta USD/kg. Son productos y presentaciones distintos y no se igualan directamente.
- **Precios mayoristas (SIPSA)** ≠ precio que recibe el productor en finca. El mayorista incluye transporte y margen.
- **Precio al productor (FAOSTAT)** suele ser anual y llega con uno o dos años de rezago. Se debe indicar el año del dato.

---

## 8. Arquitectura

### 8.1 Vista general
```
                ┌────────────────────────────────────────────┐
 Fuentes        │ FNC (PDF) · SIPSA (SOAP) · Banco Mundial   │
 externas       │ (XLSX) · FAOSTAT (API/CSV) · TRM (JSON)    │
                └───────────────┬────────────────────────────┘
                                │  jobs programados (@nestjs/schedule)
                ┌───────────────▼────────────────────────────┐
 apps/api       │ IngestaModule → adapters → normalización   │
 (NestJS)       │ → upsert idempotente → bitácora            │
                │ API REST de lectura (+ caché, ETag)        │
                │ API admin (JWT)                            │
                └───────────────┬────────────────────────────┘
                                │ TypeORM
                ┌───────────────▼────────────────────────────┐
                │ PostgreSQL                                 │
                └────────────────────────────────────────────┘
                                ▲ HTTPS /api
                ┌───────────────┴────────────────────────────┐
 apps/web       │ Angular PWA (service worker, caché offline)│
 (Angular)      │ Hoy · Histórico · Nacional · Internacional │
                │ (globo MapLibre, lazy) · Fuentes · Admin   │
                └────────────────────────────────────────────┘
```

### 8.2 Decisiones técnicas
| Tema | Decisión | Motivo |
|---|---|---|
| Lenguaje | TypeScript estricto en todo el proyecto | Requisito del proyecto; tipos compartidos entre API y web |
| Monorepo | npm workspaces (`apps/api`, `apps/web`, `packages/shared`) | Simple, sin herramientas extra |
| Globo | **MapLibre GL JS v5+** con proyección `globe` | Open source, sin token ni costo, soporta coropletas y clics por país, y tiene globo nativo desde la v5 |
| Mapa base | **Sin tiles externos.** Solo el GeoJSON simplificado de países (Natural Earth, dominio público) sobre un fondo sólido | Mucho más liviano, se puede cachear offline y la estética es limpia |
| Gráficas | Chart.js con imports selectivos | Liviano y suficiente |
| Estilos | SCSS y variables CSS, sin framework de UI | Control del peso y de la estética |
| Caché del lado del servidor | Caché en memoria de Nest (y Redis si llega a necesitarse) | Los datos cambian como máximo una vez al día |
| Autenticación | JWT, un solo rol (ADMIN) | Fase 1 sin usuarios finales |

### 8.3 Alternativas evaluadas para el globo
| Opción | Ventajas | Desventajas | Veredicto |
|---|---|---|---|
| **MapLibre GL JS (globe)** | Open source, coropletas nativas, eventos por país, buen rendimiento | Requiere WebGL | ✅ Elegida |
| globe.gl (three.js) | Muy vistoso, fácil de usar | Más pesado (three.js) y menos orientado a mapas de datos | Plan B si se busca más efecto visual |
| D3 con proyección ortográfica (SVG/canvas) | Muy liviano y no requiere WebGL | Más código manual para la interacción y el zoom | Plan B para equipos de gama baja |
| CesiumJS | Globo profesional | Muy pesado para conexiones lentas | ❌ |
| Mapbox GL | Calidad alta | Requiere token y tiene costos | ❌ |

---

## 9. Modelo de datos (Fase 1)

```
producto            (id, slug UNIQUE, nombre, descripcion, unidad_base, activo)
fuente              (id, slug UNIQUE, nombre, descripcion NULL, tipo[OFICIAL_NACIONAL|INTERNACIONAL|MANUAL],
                     url, licencia, frecuencia[DIARIA|SEMANAL|MENSUAL|ANUAL|A_DEMANDA], activo)
pais                (iso3 PK, iso2, nombre_es, region, lat, lng)
mercado             (id, nombre, fuente_id FK NULL, codigo_externo NULL,
                     tipo[MAYORISTA|BOLSA|REFERENCIA|LOCAL], municipio, departamento,
                     pais_iso3 FK, lat NULL, lng NULL)
  UNIQUE (nombre, pais_iso3)
  UNIQUE (fuente_id, codigo_externo) WHERE codigo_externo IS NOT NULL
                    -- identidad del mercado en su fuente: clave del upsert al ingerir
producto_fuente     (producto_id, fuente_id, codigo_externo, presentacion, notas)
                    -- mapea nuestros productos a los códigos de cada fuente

observacion_precio  (id, producto_id FK, fuente_id FK, mercado_id FK NULL, pais_iso3 FK NULL,
                     fecha DATE, periodicidad, presentacion,         -- p. ej. "pergamino seco", "verde arábica"
                     valor NUMERIC(18,4), moneda CHAR(3), unidad,     -- valor ORIGINAL
                     valor_cop_kg NUMERIC(18,4) NULL,                 -- derivado, si aplica
                     valor_usd_kg NUMERIC(18,4) NULL,                 -- derivado, si aplica
                     metadata JSONB, ingesta_id FK NULL, creado_por NULL,
                     anulado BOOLEAN DEFAULT false, motivo_anulacion NULL,
                     creado_en TIMESTAMPTZ, actualizado_en TIMESTAMPTZ)
  UNIQUE (producto_id, fuente_id, COALESCE(mercado_id,0), COALESCE(pais_iso3,''),
          fecha, periodicidad, presentacion)            -- clave de upsert idempotente
  INDEX (producto_id, fecha DESC)
  INDEX (pais_iso3, producto_id, fecha DESC)

tasa_cambio         (fecha, moneda_origen, moneda_destino, valor NUMERIC(18,6), fuente_id)
  PK (fecha, moneda_origen, moneda_destino)

ingesta_ejecucion   (id, fuente_id, disparo[PROGRAMADO|MANUAL], inicio, fin,
                     estado[EN_CURSO|OK|PARCIAL|ERROR], leidos, insertados, actualizados,
                     mercados_nuevos, error TEXT, payload_hash)

usuario_admin       (id, email UNIQUE, hash_password, activo, ultimo_acceso)
```

**Reglas:**
- `observacion_precio` nunca se borra físicamente; se anula con un motivo.
- Los mercados que llegan en una ingesta se crean o actualizan por `(fuente_id, codigo_externo)`, nunca por el nombre. El nombre, el municipio y el departamento se guardan tal como los publica la fuente; lo que la fuente no trae (p. ej. coordenadas) queda en `NULL`.
- Las conversiones a COP/kg o USD/kg usan la TRM de la misma fecha (o la hábil anterior) y factores de unidad declarados en código (por ejemplo, 1 lb = 0,45359237 kg). **No se hacen conversiones entre presentaciones distintas.**

---

## 10. API (borrador v1)

Prefijo: `/api`. Las respuestas de lectura son públicas y llevan `Cache-Control` y `ETag`. Documentación interactiva en `/api/docs` (Swagger).

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/salud` | Estado de la API, de la base de datos y de cada fuente |
| GET | `/productos` | Catálogo de productos |
| GET | `/fuentes` | Fuentes con su última ingesta exitosa y su estado |
| GET | `/mercados?tipo=` | Mercados |
| GET | `/precios/hoy` | Última observación por producto (alimenta la pantalla "Hoy") |
| GET | `/precios/serie?producto=&fuente=&mercado=&desde=&hasta=` | Serie histórica |
| GET | `/precios/comparativo?producto=&fecha=` | Precios por mercado nacional en una fecha |
| GET | `/internacional/commodities?producto=&desde=&hasta=` | Serie internacional (Banco Mundial) |
| GET | `/internacional/paises?producto=&anio=` | Valor por país para la coropleta del globo |
| GET | `/internacional/paises/:iso3?producto=` | Detalle y serie de un país |
| GET | `/tasas/trm?desde=&hasta=` | TRM |
| POST | `/auth/login` | Login del administrador |
| GET | `/admin/ingestas?fuente=&estado=` | Bitácora (requiere JWT) |
| POST | `/admin/ingesta/:fuente` | Ejecutar la ingesta manualmente (requiere JWT) |
| POST | `/admin/precios` | Carga manual (requiere JWT) |
| PATCH | `/admin/precios/:id/anular` | Anular con motivo (requiere JWT) |

Ejemplo de respuesta de `/precios/hoy`:
```json
{
  "generadoEn": "2026-11-15T13:00:00-05:00",
  "items": [
    {
      "producto": { "slug": "cafe", "nombre": "Café" },
      "fuente": { "slug": "fnc", "nombre": "Federación Nacional de Cafeteros" },
      "fecha": "2026-11-14",
      "presentacion": "pergamino seco",
      "valor": "0000000.0000",
      "moneda": "COP",
      "unidad": "carga 125 kg",
      "variacion": { "absoluta": "0.0000", "porcentaje": "0.00", "fechaAnterior": "2026-11-13" }
    }
  ]
}
```
*(Los valores son marcadores de forma, no datos reales).*

---

## 11. Diseño de interfaz

### 11.1 Principios
1. **Lo primero que se ve es el precio de hoy.**
2. Hay una sola acción principal por pantalla.
3. El lenguaje es cotidiano: "Precio de la carga hoy" en lugar de "Precio interno de referencia FR-94".
4. Cada número muestra su fuente y su fecha.
5. Estética limpia: fondo claro, un color de acento (verde café o tierra), mucho espacio en blanco, íconos simples y sin imágenes pesadas.

### 11.2 Navegación (móvil)
Barra inferior con 4 pestañas: **Hoy · Histórico · Mundo · Fuentes**. El acceso de administración no aparece en la navegación pública (ruta `/admin`).

### 11.3 Bocetos de pantallas
```
┌─────────────────────────┐   ┌─────────────────────────┐
│ AgroPrecios     ⟳  ⓘ    │   │ Mundo · Café ▾  2025 ▾  │
│ Sáb 15 nov · Pitalito   │   │                         │
│ ┌─────────────────────┐ │   │        ╭───────╮        │
│ │ ☕ Café pergamino    │ │   │      ╭─┤ globo ├─╮      │
│ │ $ X.XXX.XXX / carga │ │   │      │ (girable) │      │
│ │ ▲ 1,2 % vs ayer     │ │   │      ╰───────────╯      │
│ │ FNC · 14 nov        │ │   │  ■ bajo ■ medio ■ alto  │
│ └─────────────────────┘ │   │ [Centrar en Colombia]   │
│ ┌─────────────────────┐ │   │ ┌─────────────────────┐ │
│ │ 🍌 Plátano hartón   │ │   │ │ Brasil              │ │
│ │ $ X.XXX / kg        │ │   │ │ US$ X,XX / kg (2024)│ │
│ │ ▼ 0,5 % · SIPSA     │ │   │ │ 12 % menos que COL  │ │
│ └─────────────────────┘ │   │ │ FAOSTAT  [Ver serie]│ │
│  … cacao · pitaya …     │   │ └─────────────────────┘ │
│ ⚠ Sin conexión · datos  │   │ [Ver como tabla]        │
│   del 14 nov            │   └─────────────────────────┘
├─────────────────────────┤
│ Hoy  Histórico Mundo  ⓘ │
└─────────────────────────┘
```

---

## 12. Estrategia offline (PWA)

| Recurso | Estrategia del service worker | Duración en caché |
|---|---|---|
| Shell de la app (JS, CSS, HTML, íconos) | `assetGroups` en modo `prefetch` | Hasta la siguiente versión |
| GeoJSON de países (~200–400 kB simplificado) | `assetGroups` en modo `lazy` | Hasta la siguiente versión |
| MapLibre (chunk diferido) | `assetGroups` en modo `lazy` | Hasta la siguiente versión |
| `/api/precios/hoy`, `/api/fuentes` | `dataGroups` con `freshness`, timeout de 4 s | 7 días |
| `/api/precios/serie`, `/api/internacional/**` | `dataGroups` con `freshness`, timeout de 4 s | 30 días |
| `/api/admin/**` | Sin caché | — |

En la interfaz se muestran el indicador de conexión y la fecha de los datos, y se avisa cuando hay una actualización de la app disponible ("Nueva versión, toca para actualizar").

---

## 13. Seguridad, legalidad y riesgos

### 13.1 Aspectos legales
- **Licencias de los datos:** cada fuente tiene sus propios términos, que deben verificarse y documentarse. Hay que citar la fuente en la UI. Si el proyecto llega a monetizarse, se debe revisar si alguna licencia (por ejemplo, la de FAOSTAT) restringe el uso comercial.
- **Descarga de sitios web (FNC):** revisar los términos de uso y el `robots.txt`. Si no es claro, usar la carga manual o pedir autorización a la entidad.
- **Datos personales (Ley 1581 de 2012):** en la Fase 1 solo existe la cuenta del administrador y no se recolectan datos de usuarios finales. Si se agrega analítica, debe ser anónima y sin cookies de terceros. La Fase 2, con registro de comercios y campesinos, requerirá una política de tratamiento de datos y la autorización de los titulares.
- **Descargo de responsabilidad visible:** "Los precios son de referencia y provienen de fuentes públicas. No constituyen una oferta de compra ni una asesoría financiera."

### 13.2 Riesgos
| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Una fuente cambia su formato o su URL | Alta | Alto | Adapters aislados, tests con fixtures, alertas en `/salud`, carga manual como respaldo |
| La FNC no permite descargar su PDF | Media | Alto | Carga manual diaria; solicitar acceso a la entidad |
| SIPSA no tiene datos de cacao o pitaya en mercados cercanos | Media | Medio | Mostrar el mercado más cercano disponible; FAOSTAT/Banco Mundial como contexto |
| Mala conectividad en la vereda | Alta | Alto | PWA offline, bundle pequeño, globo diferido |
| Equipos de gama baja sin WebGL | Media | Medio | Detección y vista de tabla alternativa |
| Malinterpretar precios de presentaciones distintas | Alta | Medio | Etiquetas de presentación siempre visibles y advertencias de comparabilidad |
| Costos de hosting | Baja | Medio | Instancia pequeña y caché agresiva; los datos cambian una vez al día |

---

## 14. Despliegue

- **Entornos:** `local` (Docker Compose), y `produccion`, con `staging` opcional.
- **Opción sugerida:** un VPS pequeño con Docker Compose (API, PostgreSQL y Caddy o Nginx con HTTPS automático), o una plataforma administrada (API y PostgreSQL gestionados) con el frontend estático en un CDN.
- Los jobs de ingesta corren dentro de la API (`@nestjs/schedule`). Si se escala a varias instancias, se moverán a un worker único.
- **Copias de seguridad diarias** de PostgreSQL.
- **CI** (GitHub Actions): lint, tests y build de `api` y `web` en cada PR.
- Dominio con HTTPS, que es obligatorio para el service worker. Puede ser un subdominio gratuito (DuckDNS); ver `docs/DESPLIEGUE-GCP.md`.
- **Despliegue continuo:** al pasar el CI en `main`, el workflow `Desplegar` construye las imágenes en GitHub Actions y las envía por SSH a la VM, donde `scripts/desplegar-remoto.sh` hace respaldo, migraciones, semillas, arranque, verificación de salud y reversión automática si falla.

---

## 15. Roadmap

| Etapa | Entregables | Criterio de terminado |
|---|---|---|
| **0. Base** | Monorepo, Docker Compose, Nest y Angular arrancan, migración inicial, seeds de catálogo, CI | `npm run build` y los tests pasan en CI |
| **1. Café** | Adapter de TRM, adapter FNC (o carga manual), `/precios/hoy`, pantalla "Hoy" con café | El precio del café aparece en la app con su fuente y fecha |
| **2. Nacional** | Adapter SIPSA (SOAP), histórico, comparativo nacional | Plátano/banano y pitaya con serie de 30 días |
| **3. Internacional** | Adapter del Banco Mundial, series de commodities | Gráfica internacional vs nacional con advertencias |
| **4. Globo** | Adapter FAOSTAT, `/internacional/paises`, globo MapLibre con coropleta y panel por país, vista en tabla | Girar, seleccionar un país y ver su dato. Funciona offline |
| **5. PWA y calidad** | Service worker afinado, presupuestos, accesibilidad, página de fuentes, panel de administración completo | Lighthouse PWA aprobado y prueba sin conexión superada |
| **6. Lanzamiento** | Despliegue, dominio, capacitación con la comunidad (2 sesiones), encuesta | 8 campesinos capacitados y encuesta aplicada |
| **Fase 2** | Comercios y compradores, precios locales reportados, reseñas moderadas, usuarios | Por definir |
| **Fase 3** | Alertas por WhatsApp o SMS, proyecciones | Por definir |

---

## 16. Preguntas abiertas (por verificar)

1. ¿La FNC permite la descarga automatizada de su boletín diario? ¿Existe otro canal de datos? → **Respondida parcialmente (2026-11-16):** sus términos de uso prohíben la extracción automatizada sin autorización escrita y restringen la publicación del contenido (ver `docs/fuentes/fnc.md`). Se usa carga manual. **Pendiente:** solicitar autorización escrita a la FNC para publicar el precio en AgroPrecios y, si es posible, para leer el boletín de forma automática.
2. ¿Qué códigos de artículo de SIPSA corresponden a plátano, banano, pitaya y cacao? ¿Cuál es el mercado mayorista más cercano a Pitalito con datos? → **Respondida (2026-11-16):** plátano hartón verde (35), plátano guineo (34) y banano (15); pitaya y cacao no están en el servicio web. El mercado del Huila con datos es Neiva, Surabastos (ver `docs/fuentes/sipsa.md`).
3. ¿Cuál es la URL estable y la licencia actual del archivo mensual del Banco Mundial? → **Respondida (2026-11-16):** XLSX "CMO Historical Data Monthly" (Pink Sheet), licencia CC BY 4.0. La URL cambia con cada edición, por eso es configurable (`WORLDBANK_URL`); ver `docs/fuentes/worldbank.md`.
4. ¿Qué licencia y qué cobertura de países y años tiene FAOSTAT para café, cacao, banano y pitaya? → **Respondida (2026-11-16):** CC BY 4.0 con cita obligatoria; café, cacao, banano y plátano desde 1991, con unos dos años de rezago (último año: 2024) y cobertura modesta (unos 15 a 35 países por producto y año). La pitaya no está en FAOSTAT. Ver `docs/fuentes/faostat.md`.
5. ¿Cuál es el dataset oficial de TRM a usar y en qué formato? → **Respondida (2026-11-16):** dataset `32sa-8pi3` de la Superfinanciera en datos.gov.co, JSON (API Socrata), licencia CC BY-SA 4.0 (ver `docs/fuentes/trm.md`).
6. ¿Hay precios de las compras de café locales (Pitalito) que se puedan publicar? (Relevante para la Fase 2).
7. ¿Cuál será el nombre definitivo y el dominio del proyecto?
8. **(Pendiente, 2026-11-16)** Escribir al DANE (contacto@dane.gov.co) para preguntar si existe una consulta SIPSA filtrada por fecha o producto. Hoy cada ingesta descarga ~316 MB con todo el histórico. Mientras tanto, la frecuencia se ajusta con `SIPSA_CRON` y `SIPSA_DIAS_VENTANA` (datos de prueba en desarrollo; los intervalos de producción se definirán al desplegar).
9. **(Pendiente)** Pitaya y cacao no están en el servicio web de SIPSA. Hay que buscar y verificar otra fuente oficial (p. ej. anexos de los boletines SIPSA) antes de mostrarlos.

---

## 17. Registro de decisiones

| Fecha | Decisión | Motivo |
|---|---|---|
| 2026-11-15 | Stack NestJS + TypeORM + PostgreSQL + Angular, 100 % TypeScript | Preferencia del autor y tipos compartidos |
| 2026-11-15 | PWA con soporte offline como requisito central | Mala conectividad en la vereda |
| 2026-11-15 | Fase 1 solo recopila y muestra datos; los comercios pasan a la Fase 2 | Reducir el alcance inicial |
| 2026-11-15 | Globo con MapLibre GL JS (proyección globe) sin tiles externos | Liviano, gratuito y cacheable offline |
| 2026-11-16 | Versiones base: Node 24 LTS, TypeScript 6.0, NestJS 12, Angular 22, TypeORM 1.1, PostgreSQL 17 | Versiones vigentes y compatibles entre sí. Angular 22 y typescript-eslint exigen TypeScript `>=6.0 <6.1`, así que no se usa TypeScript 7 |
| 2026-11-16 | API en ESM (`"type": "module"`) con Vitest, como la genera Nest CLI 12; ESLint (typescript-eslint) en vez de oxlint | ESM y Vitest son el estándar actual de Nest. ESLint mantiene una sola herramienta de lint coherente con Angular (angular-eslint) |
| 2026-11-16 | Web Angular *zoneless*, standalone, OnPush y `httpResource` para lecturas | Menos JavaScript inicial y reactividad con signals |
| 2026-11-16 | Entidades y migraciones listadas de forma explícita (`database/entidades.ts`, `database/migraciones.ts`), sin globs; el CLI de TypeORM y los seeds corren desde `dist/` | Funciona igual en `src/` (Vitest) y en `dist/`, sin ts-node. Costo: cada migración nueva se agrega a mano al arreglo |
| 2026-11-16 | La clave única con `COALESCE` de `observacion_precio` y los índices con `fecha DESC` se escriben a mano en la migración (`@Index(..., { synchronize: false })`) | TypeORM no soporta índices con expresiones ni con orden. El upsert debe usar `ON CONFLICT` con las mismas expresiones |
| 2026-11-16 | Plátano y banano son productos separados (`platano`, `banano`) | Las fuentes (SIPSA, FAOSTAT, Banco Mundial) los reportan como artículos distintos; no se mezclan presentaciones |
| 2026-11-16 | Países ISO desde `i18n-iso-countries` (MIT); `region`, `lat` y `lng` quedan en `null` hasta la etapa del globo (Natural Earth, dominio público) | Se descartó `world-countries` porque su licencia ODbL es *share-alike* sobre bases derivadas (riesgo legal) |
| 2026-11-16 | Los seeds de `fuente` usan la página institucional de cada entidad y `licencia = null` ("Por verificar") | No inventar URLs ni licencias: se completan al verificar cada fuente en `docs/fuentes/<slug>.md` |
| 2026-11-16 | Estado de una fuente en `GET /api/fuentes`: `NO_APLICA` (manual), `ERROR` (última ejecución falló), `SIN_DATOS`, `ATRASADA` o `AL_DIA`, con tolerancia de 4 / 10 / 45 / 400 días para frecuencia diaria / semanal / mensual / anual | Da holgura a fines de semana, festivos y rezagos normales de publicación |
| 2026-11-16 | `GET /api/salud` reporta por ahora solo la base de datos y responde 503 si falla; el estado por fuente se agrega con la ingesta | No hay ingestas todavía |
| 2026-11-16 | Lecturas de catálogo con `Cache-Control: public, max-age=300, stale-while-revalidate=86400` y ETag fuerte (304 en revalidación); `/salud` con `no-store` | Los datos cambian como máximo una vez al día |
| 2026-11-16 | Presupuesto de rendimiento doble: budgets de `angular.json` (450 kB aviso / 600 kB error, sin comprimir) más `apps/web/scripts/verificar-peso.mjs`, que hace fallar el build si el bundle inicial supera 200 kB **gzip** | Los budgets de Angular no miden gzip |
| 2026-11-16 | Tipografía del sistema (sin fuentes web) y paleta con contraste AA verificado | Cero descargas extra en conexiones lentas |
| 2026-11-16 | `packages/shared` solo emite declaraciones `.d.ts` (se compila en `postinstall`) y la API declara los valores de los enums con `satisfies` contra esos tipos | Tipos compartidos sin lógica y sin problemas de `rootDir` entre paquetes |
| 2026-11-16 | Contraseña del admin con `bcryptjs` (costo 12); el seed solo crea el admin si no existe y nunca sobrescribe su contraseña | JavaScript puro (sin compilación nativa en Windows) |
| 2026-11-16 | **Etapa 1 (aprobado por el autor):** `fuente.descripcion` y enum propio `frecuencia_fuente` con `A_DEMANDA` (la fuente `manual` lo usa); `observacion_precio.periodicidad` conserva el enum `frecuencia` | RF-06 pide la descripción; "a demanda" no es una periodicidad de un dato |
| 2026-11-16 | **Etapa 1 (aprobado):** `FuenteAdapter` puede devolver `tasas` además de `observaciones`, y `advertencias` (ejecución `PARCIAL`) | La TRM es una tasa de cambio, no un precio |
| 2026-11-16 | **FNC sin adapter automático:** el precio del café se registra por carga manual (`POST /api/admin/precios`) | Los términos de uso de la FNC prohíben la extracción automatizada sin autorización escrita (`docs/fuentes/fnc.md`) |
| 2026-11-16 | TRM: cada rango de vigencia de datos.gov.co se expande a una fila por día en `tasa_cambio`; descarga de las últimas 40 filas por ejecución; jobs a las 07:30 y 18:30 (Bogotá), desactivables con `INGESTA_PROGRAMADA` | Búsqueda directa "TRM de la fecha X" y relleno automático de huecos |
| 2026-11-16 | Conversiones con `big.js` (MIT, ~6 kB, solo API) y tabla de unidades en código (`kg`, `carga 125 kg`, `arroba`, `lb`, `USc/lb`); la carga manual solo acepta unidades conocidas | Nunca `number` para dinero; los derivados COP/kg y USD/kg siempre se pueden calcular |
| 2026-11-16 | Carga manual: 409 si ya hay un precio activo con la misma clave; para corregir se anula y se vuelve a cargar, y la fila anulada se reutiliza guardando el valor anterior en `metadata.historial` | Conserva el índice único de la §9 y la trazabilidad (quién, cuándo, motivo y valor anterior) |
| 2026-11-16 | Autenticación con `@nestjs/jwt` y un guard propio (sin Passport); login limitado a 5 intentos por minuto; JWT HS256 de 15 min | Menos dependencias; protección contra fuerza bruta |
| 2026-11-16 | `GET /api/precios/hoy` agrega a la forma de la §10: `mercado`, `valorCopKg`, `complementos` (Bolsa de Nueva York para el café), `hoy`, `sinDatos` y `trm` con su licencia | RF-01 pide la Bolsa de NY y la TRM como datos secundarios; la licencia CC BY-SA de la TRM exige atribución |
| 2026-11-16 | La referencia de "Hoy" por producto se configura en `apps/api/src/precios/referencias-hoy.ts`; el café usa FNC / pergamino seco / sin mercado | Separar el criterio de negocio del código de consulta |
| 2026-11-16 | **Etapa 2 (aprobado por el autor):** SIPSA sin el paquete `soap`: `fetch` con el sobre SOAP 1.2 y parser SAX en streaming `saxes` (ISC, una dependencia, solo API) | La respuesta trae ~316 MB con todo el histórico; un parser que arma el documento completo en memoria no es viable. `fast-xml-parser` (≈1,3 MB, en memoria) y `htmlparser2` (HTML) descartados |
| 2026-11-16 | **Etapa 2 (aprobado):** mercados creados automáticamente al ingerir, identificados por `(fuente_id, codigo_externo)` (migración `MercadoCodigoFuente`), con upsert idempotente; nombre, municipio y departamento tal como vienen de la fuente; sin coordenadas inventadas (`NULL`); `ingesta_ejecucion.mercados_nuevos` registra cuántos se crearon | Evita duplicados cuando la fuente renombra un mercado (SIPSA tiene 26 nombres para 23 códigos) y deja trazabilidad |
| 2026-11-16 | Horarios y ventana de ingesta configurables por entorno: `TRM_CRON`, `SIPSA_CRON` (por defecto 15:30 de lunes a sábado), `SIPSA_DIAS_VENTANA` (45); se validan al arrancar | El autor definirá los intervalos de producción; en desarrollo bastan datos de prueba |
| 2026-11-16 | Etapa 2 se cierra con plátano (hartón verde y guineo) y banano; pitaya y cacao quedan "próximamente" | No están en el servicio web de SIPSA (pregunta abierta 9) |
| 2026-11-16 | Endpoint adicional `GET /api/precios/series?producto=` (series comparables disponibles, con la predeterminada marcada) para el selector de Histórico y Nacional | El selector de RF-02 necesita saber qué combinaciones de mercado y presentación existen |
| 2026-11-16 | "Hoy" y el comparativo eligen mercado por cercanía a Pitalito: Neiva (Huila) → Popayán (Cauca) → Bogotá Corabastos; se usa el primero con datos de los últimos 10 días | Neiva es la central del mismo departamento; sin coordenadas verificadas no se calcula distancia |
| 2026-11-16 | Cada dato viaja con la cita que exige su licencia (`fuente.cita`: DANE, TRM) y se muestra en la interfaz | Términos de uso del DANE (cita textual) y CC BY-SA de la TRM |
| 2026-11-16 | `Cache-Control` de precios, tasas y fuentes: `max-age=300, stale-while-revalidate=60` (antes 86400) | Con una ventana larga el navegador mostraba precios de horas atrás después de una ingesta; el modo sin conexión lo da el service worker |
| 2026-11-16 | Gráficas con Chart.js 4 (MIT), solo los módulos de línea, cargado con `import()` dentro de Histórico (~61 kB gzip, fuera del bundle inicial) | RF-02; CLAUDE.md pide imports selectivos |
| 2026-11-16 | **Etapa 3 (aprobado por el autor):** Banco Mundial con `fflate` (MIT, sin dependencias) + `saxes` para leer el XLSX; el código externo de cada serie es el encabezado exacto de su columna y se valida que la unidad sea `($/kg)` | Liviano y solo en la API. Se descartaron `xlsx` (versión de npm desactualizada, con vulnerabilidades conocidas) y `exceljs` (pesado) |
| 2026-11-16 | **Etapa 3 (aprobado):** `WORLDBANK_URL` configurable; si responde 404, el adapter busca el enlace vigente en la página oficial (una petición más) y lo advierte en la bitácora | La URL del archivo cambia con el tiempo |
| 2026-11-16 | **Etapa 3 (aprobado):** las series mensuales se convierten a COP/kg con el **promedio mensual de la TRM** (las diarias siguen usando la TRM del día o la hábil anterior) | El precio del Banco Mundial es un promedio del mes |
| 2026-11-16 | **Etapa 3 (aprobado):** el cacao aparece en "Hoy" con el precio internacional del Banco Mundial, rotulado "Precio internacional · promedio mensual", con equivalente en pesos y advertencia | No hay fuente nacional verificada del cacao (pregunta abierta 9) |
| 2026-11-16 | El upsert de observaciones también detecta cambios en `valor_cop_kg` | Si la TRM se carga después que el precio en USD, el valor en pesos se recalcula al reingerir |
| 2026-11-16 | Primera carga de la TRM con `?desde=1990-01-01` (desde 1991 en el dataset) y límite de 50.000 filas por consulta | Permite valores en pesos de las series internacionales desde 1991; un límite menor cortaba el histórico sin avisar |
| 2026-11-16 | **Etapa 4:** globo con MapLibre GL 5 (proyección `globe`), sin tiles externos: fondo sólido + GeoJSON de Natural Earth (`/geo/paises.geojson`) coloreado con `feature-state` | Funciona offline y no depende de servicios de mapas de terceros ni de llaves de API |
| 2026-11-16 | Coropleta en 5 quintiles con la escala viridis + gris "Sin datos"; leyenda en USD/kg | Apta para daltonismo; los quintiles evitan que valores extremos (p. ej. café de EE. UU./Hawái, España/Canarias) aplasten la escala |
| 2026-11-16 | El componente del globo va en un bloque `@defer (on viewport)` y MapLibre con `import()`; su CSS se copia a `public/vendor/` (script `copiar-vendor.mjs`) y se inyecta solo al abrir el globo | Bundle inicial sin cambios (~101 kB gzip); MapLibre (~232 kB gzip) solo se descarga en "Mundo" |
| 2026-11-16 | `namedChunks` en producción y grupo `globo` del service worker en modo `lazy` (excluido del `prefetch` del shell) | En la vereda no conviene descargar 232 kB de MapLibre en cada actualización si el usuario no abre el globo; tras la primera visita queda en caché offline |
| 2026-11-16 | Sin WebGL (o si MapLibre falla) la vista cambia sola a la tabla; también hay botón "Ver como tabla". La rotación lenta se detiene al primer toque y no ocurre con `prefers-reduced-motion` | CLAUDE.md: vista alternativa para equipos de gama baja; accesibilidad |
| 2026-11-16 | Parámetros de URL de la sección de países: `productoPais`, `anio`, `vista`, `pais` | No chocan con `producto` de la sección de bolsa en la misma página |
| 2026-11-16 | **Etapa 5:** la antigüedad de los datos se toma del encabezado `Date` de la última respuesta de lectura de la API (el service worker lo conserva al responder desde caché). Sin red: "Sin conexión · datos de hace X"; con red pero respuesta de más de 15 min: "Conexión lenta · mostrando datos de hace X" | No requiere cambiar la API ni la caché; cubre también el caso de conexión lenta (timeout de 4 s del SW) |
| 2026-11-16 | Versión nueva de la app: aviso "Hay una nueva versión · Toca para actualizar"; no se recarga sola. Se revisa al abrir y cada 6 h | Evita perder lo que el usuario está viendo; el usuario decide |
| 2026-11-16 | `/api/salud` incluye el estado de la ingesta de cada fuente (mismo cálculo que `/api/fuentes`); el estado global (y el 503) depende solo de la base de datos | Un monitor externo no debe marcar caída la API porque una fuente externa esté atrasada |
| 2026-11-16 | Panel de administración web en `/admin` (fuera de la navegación pública): ingestas manuales, bitácora, carga manual y anulación. Nuevo `GET /api/admin/precios` (solo ADMIN) para listar lo cargado a mano | Antes solo se podía administrar con Swagger o curl |
| 2026-11-16 | Token del administrador en `sessionStorage` (se borra al cerrar la pestaña); el interceptor lo envía solo a `/api/admin/**` y cierra la sesión ante un 401 | Menor exposición en equipos compartidos; ninguna petición pública lleva el token |
| 2026-11-16 | En la carga manual, el valor admite "2.075.000" y "278,65" y se normaliza a punto decimal; con un solo punto y sin coma se toma como decimal (no se adivina) | Evita errores de digitación frecuentes sin introducir ambigüedad |
| 2026-11-16 | **Etapa 6:** producción con Docker Compose (`db`, `api`, `web`, `respaldo`) y **Caddy** como servidor de la PWA y proxy de `/api` en el mismo dominio, con HTTPS automático (Let's Encrypt) | Un solo dominio (sin CORS cruzado, el SW cachea `/api`), certificados sin mantenimiento manual. Ver `docs/DESPLIEGUE.md` |
| 2026-11-16 | CSP estricta en la PWA (`script-src 'self'`; `style-src 'unsafe-inline'` por los estilos de componentes de Angular; `blob:` para los workers de MapLibre). Para no tener scripts en línea se desactiva `inlineCritical` (el CSS global pesa ~1 kB) | Protección contra XSS sin hashes que cambien en cada build |
| 2026-11-16 | Variable `TRUST_PROXY` (0 por defecto; 1 detrás de Caddy) | Sin ella, el límite de peticiones por IP vería a todos los usuarios como la IP del proxy y los bloquearía juntos |
| 2026-11-16 | Respaldo diario con `pg_dump` (formato custom) a las 2:00 a. m., retención configurable (`RESPALDO_DIAS_RETENCION`, 14 días) | Recuperación ante errores; la copia fuera del servidor queda como tarea operativa |
| 2026-11-16 | `ACME_EMAIL` obligatorio en producción | Caddy no arranca con el correo vacío (detectado en la prueba del stack) |
| 2026-11-16 | **MapLibre GL 6.18** en lugar de 5.24 (CLAUDE.md pide "v5+"). El worker de v6 se sirve desde `/vendor` (`setWorkerUrl`) | `npm audit`: vulnerabilidad crítica GHSA-jrc7-96c5-q579 (XSS en `DOM.sanitize`) en ≤ 6.4.0, sin parche en la rama 5. Costo: el globo descarga ~395 kB gzip (antes ~232 kB), solo al abrir "Mundo" y una vez (caché offline). **Revisar** si se prefiere volver a v5 por peso (ver `docs/PENDIENTES.md`) |
| 2026-11-18 | **Rediseño de la interfaz (UX/UI):** paleta "cafetal" (verde hoja, café tostado, rojo cereza, fondo crema), logo de grano de café con hoja, ilustraciones SVG en línea por producto, tarjetas con franja de color por producto, filtros con pasos numerados y botones de producto con dibujo (en lugar de `<select>`), cajas de ayuda plegables y navegación en el encabezado en pantallas ≥ 64 rem (mismo `<nav>`) | Los usuarios son campesinos con poca experiencia en aplicaciones: elegir mirando dibujos y seguir pasos 1-2-3 es más fácil que leer listas. Sin librerías nuevas ni descargas extra (bundle inicial 104,7 kB gzip) |
| 2026-11-18 | El **globo es lo primero en "Mundo"**, grande (hasta 46 rem de alto, de borde a borde en el celular), con botones + / −, "Ver todo el mundo", etiqueta flotante con precio al pasar el cursor y la ficha del país al lado en escritorio. Coropleta con ColorBrewer **YlOrBr** (antes viridis) | Pedido del usuario: mapa más grande y central. YlOrBr sigue siendo secuencial y apta para daltonismo y combina con la paleta |
| 2026-11-18 | El globo **no** se pone en "Hoy": allí hay una tarjeta ilustrada (SVG estático) que lleva a "Mundo" | CLAUDE.md exige cargar MapLibre solo en `/internacional`; además pesa ~395 kB gzip y en Hoy se cargaría en cada apertura con mala señal. **Revisar** si el usuario prefiere el globo real en Hoy aceptando ese costo |
| 2026-11-21 | **Hosting sin costo:** VM Oracle Cloud *Always Free* (ARM Ampere A1, región Colombia Central-Bogotá) con el mismo `docker-compose.prod.yml`, más un subdominio gratuito de DuckDNS con HTTPS de Let's Encrypt (Caddy). Plan B: VM `e2-micro` de Google Cloud. Se descartan los PaaS gratuitos (Render, Koyeb, Neon, Supabase) | Sin presupuesto para servidor ni dominio. La VM gratuita tiene RAM de sobra para las ingestas de SIPSA y FAOSTAT y no se duerme, así que los jobs programados sí corren; no exige cambiar código y mantiene la decisión de mismo dominio. Riesgos: verificación de la tarjeta en el registro, falta de capacidad ARM y recuperación de instancias ociosas. Ver `docs/DESPLIEGUE-ORACLE.md` |
| 2026-11-22 | **Cambio de hosting: Google Cloud `e2-micro`** (us-east1, disco estándar de 30 GB, 2 GB de swap) en lugar de Oracle. Los créditos mensuales de Google AI Pro (USD 10) cubren la IPv4 (≈ USD 3,65/mes) y el tráfico extra. Despliegue continuo con GitHub Actions: las imágenes se construyen en GitHub y viajan por SSH (`docker save | docker load`), sin registro de contenedores; `docker-compose.prod.yml` fija los nombres `agroprecios-api` y `agroprecios-web` | Oracle exige tarjeta de crédito y el equipo solo tiene débito; Google acepta débito Visa/Mastercard. Las ingestas usan streaming, así que 1 GB de RAM más swap alcanza en ejecución, pero no para compilar Angular. Sin registro de contenedores se evitan los límites de GitHub Packages en repositorios privados y las credenciales extra en la VM. Ver `docs/DESPLIEGUE-GCP.md` |

---

## 18. Glosario

- **Carga:** unidad de comercialización del café en Colombia, equivalente a 125 kg de café pergamino seco.
- **Café pergamino seco:** café con su cáscara (pergamino) y secado. Es lo que vende normalmente el caficultor.
- **Café excelso / verde:** café trillado listo para exportar. Es lo que cotiza la Bolsa de Nueva York.
- **Contrato C:** contrato de futuros de café arábica en la bolsa ICE de Nueva York, cotizado en centavos de USD por libra.
- **TRM:** Tasa Representativa del Mercado (COP por USD).
- **SIPSA:** Sistema de Información de Precios y Abastecimiento del Sector Agropecuario (DANE).
- **Precio al productor:** precio que recibe el agricultor en la finca o en el primer punto de venta.
- **Coropleta:** mapa en el que cada región se colorea según el valor de una variable.
- **PWA:** Progressive Web App, una aplicación web instalable y con capacidad offline.
