# TRM – Tasa de Cambio Representativa del Mercado (`trm`)

Verificada el **2026-11-16**.

- **Entidad:** Superintendencia Financiera de Colombia (Superfinanciera), publicada en el portal de datos abiertos del Estado colombiano.
- **Dataset:** "Tasa de Cambio Representativa del Mercado- TRM", identificador `32sa-8pi3`, procedencia *official*, categoría Economía y Finanzas.
- **Página del dataset:** https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3
- **Recurso usado por el adapter (API Socrata/SODA, JSON):** `https://www.datos.gov.co/resource/32sa-8pi3.json`
  - Últimos registros: `?$order=vigenciadesde DESC&$limit=40`
  - Desde una fecha: `?$where=vigenciadesde >= '2026-01-01T00:00:00'&$order=vigenciadesde DESC&$limit=1000`
- **Metadatos:** `https://www.datos.gov.co/api/views/32sa-8pi3.json` (el campo `metadata.custom_fields` declara "Frecuencia de Actualización: Diaria").
- **Formato:** JSON. Arreglo de objetos con las columnas:

  | Columna | Tipo Socrata | Ejemplo |
  |---|---|---|
  | `valor` | number (llega como texto) | `"3316.7"` |
  | `unidad` | text | `"COP"` |
  | `vigenciadesde` | calendar_date (sin zona) | `"2026-11-14T00:00:00.000"` |
  | `vigenciahasta` | calendar_date (sin zona) | `"2026-11-17T00:00:00.000"` |

- **Licencia:** Creative Commons Atribución-CompartirIgual 4.0 Internacional (**CC BY-SA 4.0**), `licenseId = CC_40_BY_SA`. Atribución declarada: "Superintendencia Financiera de Colombia - SUPERFINANCIERA, Bogotá D.C.".
  - Obliga a **citar la fuente** y la licencia en la interfaz.
  - *CompartirIgual:* si se redistribuye el conjunto de tasas (por ejemplo, la serie en `GET /api/tasas/trm`), esa redistribución debe ofrecerse bajo la misma licencia CC BY-SA 4.0.
- **robots.txt:** `User-agent: * / Crawl-delay: 1`. Solo restringe rutas de navegación del catálogo (`/browse`, `/catalog`, …), no la API `/resource`.
- **Autenticación / límites:** no requiere token. Sin token las peticiones comparten un cupo común; con una ejecución diaria de una sola petición no hace falta. (Opcional a futuro: *app token* de datos.gov.co.)
- **Frecuencia de publicación:** diaria. La TRM de un día se publica la tarde del día hábil anterior.

## Interpretación de los datos

Cada fila es una TRM con un **rango de vigencia**. Los fines de semana y festivos están cubiertos por la TRM del último día hábil. Ejemplo real: `3316.7` rige del 2026-11-14 (sábado) al 2026-11-17 (martes), incluido el festivo del lunes 16.

El adapter **expande cada rango a una fila por día** en `tasa_cambio` (`fecha`, `USD`→`COP`, `valor`). Así la búsqueda "TRM de la fecha X" es directa.

## Ejemplo de respuesta (real)

```json
[{"valor":"3316.7","unidad":"COP","vigenciadesde":"2026-11-14T00:00:00.000","vigenciahasta":"2026-11-17T00:00:00.000"}
,{"valor":"3301.91","unidad":"COP","vigenciadesde":"2026-11-13T00:00:00.000","vigenciahasta":"2026-11-13T00:00:00.000"}
,{"valor":"3297.07","unidad":"COP","vigenciadesde":"2026-11-11T00:00:00.000","vigenciahasta":"2026-11-12T00:00:00.000"}]
```

Fixture completo (40 filas, descargado el 2026-11-16): `apps/api/test/fixtures/trm/ultimas-40.json`.

## Productos y códigos

No aplica: la fuente entrega tasas de cambio (USD→COP), no precios de productos.

## Notas y riesgos

- Si cambia el identificador del dataset o el nombre de las columnas, el adapter falla con un error claro y la ejecución queda en la bitácora con estado `ERROR`.
- Se valida que `unidad` sea `COP`; si no, la fila se descarta y la ejecución queda `PARCIAL`.
