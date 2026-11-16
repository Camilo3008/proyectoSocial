# Natural Earth – Fronteras de países (mapa base del globo)

Verificada el **2026-11-16**. No es una fuente de precios: provee la geometría de los países para el globo y los datos de referencia de la tabla `pais` (región y coordenadas).

- **Sitio:** https://www.naturalearthdata.com/
- **Archivo:** `ne_110m_admin_0_countries.geojson`, versión **v5.1.2**, del repositorio oficial de Natural Earth:
  `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson` (838.726 bytes, 177 países).
- **Licencia:** [dominio público](https://www.naturalearthdata.com/about/terms-of-use/): "All versions of Natural Earth raster + vector map data found on this website are in the public domain… No permission is needed to use Natural Earth. Crediting the authors is unnecessary." Aun así, la interfaz muestra "Hecho con Natural Earth".

## Campos usados

| Campo | Uso | Nota |
|---|---|---|
| `ISO_A3_EH` | Código ISO del país (une el mapa con los precios) | Se usa en lugar de `ISO_A3`, que viene en `-99` para Francia y Noruega. Los territorios sin ISO (Kosovo, Somalilandia, Chipre del Norte: `-99`) se dibujan sin datos |
| `NAME_ES` | Nombre en español en el mapa | |
| `REGION_UN` | `pais.region` | |
| `LABEL_X`, `LABEL_Y` | `pais.lng`, `pais.lat` (punto de etiqueta) | Punto de referencia del país, no centroide geométrico |

## Preparación (reproducible)

`scripts/preparar-natural-earth.mjs` toma el GeoJSON original y genera:

1. `apps/web/public/geo/paises.geojson`: solo `iso3` y `nombre`, con coordenadas redondeadas a 2 decimales (~1 km, suficiente para un globo a escala mundial). Es mucho más liviano para descargar y guardar sin conexión.
2. `apps/api/src/database/seeds/datos/paises-natural-earth.json`: región y coordenadas por ISO3, para el seed de `pais`.
