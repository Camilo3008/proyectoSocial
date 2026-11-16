# Banco Mundial – Commodity Price Data, "The Pink Sheet" (`worldbank`)

Verificada el **2026-11-16**.

- **Entidad:** Banco Mundial, Prospects Group (Commodity Markets Outlook).
- **Página oficial:** https://www.worldbank.org/en/research/commodity-markets (sección "Pink Sheet Data").
- **Archivo usado (mensual, XLSX):**
  `https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx`
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, ~588 KB.
  - `Last-Modified: Tue, 03 Nov 2026 19:30:42 GMT`; la hoja dice "Updated on November 03, 2026".
  - **La URL no es permanente:** la parte `74e8be41…-0050012026` es la misma para todos los archivos de 2026 (también aparece en el Pink Sheet de mayo de 2026), pero cambia con el tiempo. El enlace vigente siempre está en la página oficial.
- **Frecuencia:** mensual (el archivo se actualiza a comienzos de cada mes con el mes anterior).
- **robots.txt:** `www.worldbank.org` solo restringe `/content/search`; `thedocs.worldbank.org` no tiene robots.txt (404).
- **Autenticación / límites:** ninguno.

## Licencia y atribución

- La página oficial, en "Using this Data", enlaza a los [Terms of Use for Datasets](https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets) y a [Data Access and Licensing](https://datacatalog.worldbank.org/public-licenses#cc-by), que licencia los datasets bajo **Creative Commons Attribution 4.0 (CC BY 4.0)**.
- No se encontró el registro específico del Pink Sheet en el Data Catalog. Para materiales no catalogados, los términos permiten **uso no comercial** con atribución. AgroPrecios es no comercial, así que el uso está permitido en cualquiera de los dos casos, **siempre con atribución**.
- **Cita en la interfaz:** "Fuente: Banco Mundial, Commodity Price Data (The Pink Sheet), CC BY 4.0".
- **No sugerir respaldo:** los términos prohíben dar a entender que el Banco Mundial patrocina o avala el uso; no se usa su logo.

## Estructura del archivo (hoja "Monthly Prices")

| Fila | Contenido |
|---|---|
| 1–4 | Título: "World Bank Commodity Price Data (The Pink Sheet)", "monthly prices in nominal US dollars, 1960 to present", "Updated on …" |
| 5 | Encabezados (nombre de cada serie) |
| 6 | Unidades, p. ej. `($/kg)` |
| 7 en adelante | Una fila por mes; columna A = periodo `AAAAMmm` (p. ej. `2026M10`), desde `1960M01` |

Los valores faltantes aparecen como `…`. Los números vienen con representación binaria (p. ej. `1.0900000000000001`) y se normalizan a 4 decimales.

Otras hojas: "Monthly Indices", "Description" (definición y fuente de cada serie), "Index Weights" y una oculta ("Mismatch Details").

## Series y códigos (verificados en el archivo del 2026-11-03)

El código externo es el **encabezado exacto** de la columna (más estable que la letra de la columna).

| Producto (slug) | Código (encabezado) | Col. | Unidad | Definición (hoja "Description") | Último dato |
|---|---|---|---|---|---|
| `cafe` | `Coffee, Arabica` | M | $/kg | ICO indicator price, other mild Arabicas, average New York and Bremen/Hamburg markets, ex-dock | 2026M10: 7.40 |
| `cafe` | `Coffee, Robusta` | N | $/kg | ICO indicator price, Robustas, average New York and Le Havre/Marseilles markets, ex-dock | 2026M10: 3.63 |
| `cacao` | `Cocoa` | L | $/kg | ICCO daily price, average of the first three positions on the terminal markets of New York and London | 2026M10: 5.75 |
| `banano` | `Banana, US` | AN | $/kg | Bananas (Central & South America), major brands, US import price, f.o.t. US Gulf ports | 2026M10: 1.18 |
| `banano` | `Banana, Europe` | AM | $/kg | Bananas (Central & South America), major brands, f.o.t. Southern Europe, including duties | 2026M10: 1.10 |
| `platano`, `pitaya` | — | — | — | No hay series | — |

## Ejemplo (valores reales, hoja "Monthly Prices")

```
fila 5: L="Cocoa" M="Coffee, Arabica" N="Coffee, Robusta" AM="Banana, Europe" AN="Banana, US"
fila 6: L="($/kg)" M="($/kg)" N="($/kg)" AM="($/kg)" AN="($/kg)"
fila 808: A="2026M10" L=5.75 M=7.4 N=3.63 AM=1.1000000000000001 AN=1.18
```

## Notas de comparabilidad (mostrar en la interfaz)

- **Café:** el Banco Mundial reporta café **verde** (arábica y robusta, *ex-dock*) en USD/kg. La FNC publica café **pergamino seco** por carga. No se igualan directamente (docs/PROYECTO.md §7.1).
- **Banano:** son precios de **importación** en EE. UU. y Europa, no precios al productor.
- Los precios son **nominales** (no ajustados por inflación) y son promedios mensuales.
