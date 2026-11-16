# FAO – FAOSTAT, Precios al productor (`faostat`)

Verificada el **2026-11-16**.

- **Entidad:** Organización de las Naciones Unidas para la Alimentación y la Agricultura (FAO), base de datos estadística FAOSTAT.
- **Conjunto de datos:** "Prices: Producer Prices" (código `PP`). Precios que reciben los agricultores, en el primer punto de venta, por país, producto y año (y por mes para algunos países).
- **Catálogo oficial de descargas masivas (JSON):** `https://bulks-faostat.fao.org/production/datasets_E.json`. Entrada `PP`:
  - `FileLocation`: `https://bulks-faostat.fao.org/production/Prices_E_All_Data_(Normalized).zip`
  - `DateUpdate`: 2026-10-09; `FileSize`: 11.411 KB; `FileRows`: 1.319.583; CSV comprimido en ZIP.
- **Descarga verificada:** HTTP 200, `application/x-zip-compressed`, 11.684.078 bytes, `Last-Modified: Fri, 09 Oct 2026 16:06:31 GMT`, ~12 s.
- **robots.txt:** `bulks-faostat.fao.org/robots.txt` responde 403 (no publica reglas). Es un servicio de descargas masivas pensado para ser consumido así. Se hace una sola descarga por ejecución.
- **Frecuencia:** anual, con actualizaciones parciales; **rezago de unos dos años** (el último año disponible en octubre de 2026 es **2024**).

## Licencia

[Condiciones de uso de las bases de datos estadísticos de la FAO](https://www.fao.org/contact-us/terms/db-terms-of-use/es/) (revisadas el 2026-11-16):

- Salvo indicación en los metadatos, los conjuntos de datos están bajo **CC BY 4.0**, con condiciones adicionales.
- **Cita obligatoria:** "FAO. [año de la última actualización]. [Nombre de la base de datos]. [Consultado el DD de Mes de AAAA]. [URL] Licencia: CC-BY-4.0".
- Prohibido usar los datos para promocionar una empresa o producto, o sugerir que la FAO respalda el uso. No falsificar ni tergiversar los datos.
- **Cita en la interfaz:** "FAO. 2026. FAOSTAT: Precios al productor. Consultado el [fecha de la ingesta]. https://www.fao.org/faostat/ Licencia: CC-BY-4.0".

## Estructura del ZIP

| Archivo | Contenido |
|---|---|
| `Prices_E_All_Data_(Normalized).csv` | Datos (214 MB sin comprimir). El adapter lo lee **en streaming** |
| `Prices_E_AreaCodes.csv` | Códigos de área (FAO y M49) |
| `Prices_E_ItemCodes.csv` | Códigos de producto |
| `Prices_E_Elements.csv` | Elementos (tipo de precio) |
| `Prices_E_Flags.csv` | Banderas de calidad |

Columnas del CSV normalizado:

```
Area Code,Area Code (M49),Area,Item Code,Item Code (CPC),Item,Element Code,Element,Year Code,Year,Months Code,Months,Unit,Value,Flag
"44","'170","Colombia","656","'01610","Coffee, green","5532","Producer Price (USD/tonne)","2024","2024","7021","Annual value","USD","3719.100000","A"
```

- `Area Code (M49)` trae un apóstrofo inicial (`'170`). El código M49 de país coincide con el ISO 3166-1 numérico y se convierte a ISO alfa-3 con `i18n-iso-countries`. Los agregados regionales (mundo, continentes) no tienen ISO y se ignoran.
- **Elementos:** `5530` Producer Price (LCU/tonne, moneda local), `5531` (SLC/tonne), `5532` **Producer Price (USD/tonne)**, `5539` índice.
- **Meses:** `7021` = valor anual; `7001`–`7012` = meses (cobertura parcial).
- **Banderas:** `A` oficial, `B` ruptura de serie, `E` estimado, `I` imputado, `X` de organización externa.

## Productos y códigos (verificados)

| Producto (slug) | Item Code | Nombre FAOSTAT | Países con dato (USD, anual) | Colombia 2024 |
|---|---|---|---|---|
| `cafe` | `656` | Coffee, green | 2019: 19 · 2022: 22 · 2024: 18 | 3.719,1 USD/t |
| `cacao` | `661` | Cocoa beans | 2019: 16 · 2022: 19 · 2024: 15 | 6.733,1 USD/t |
| `banano` | `486` | Bananas | 2019: 42 · 2022: 44 · 2024: 33 | 669,6 USD/t |
| `platano` | `487` | Plantains | 2019: 9 · 2022: 17 · 2024: 12 | 800 USD/t |
| `pitaya` | — | No existe (a lo sumo "Other tropical fruits; n.e.c.", 603, que no es específico) | — | — |

No se usa `489` ("Plantains and cooking bananas") porque es un agregado con poca cobertura (2 países en 2024) que mezclaría presentaciones.

## Uso en AgroPrecios

- Se guardan los valores **anuales en USD/t** (elemento 5532, mes 7021) por país. El valor en moneda local (5530) del mismo país, producto y año se guarda en `metadata.valorMonedaLocal` para el panel del globo.
- Derivados: USD/kg = USD/t ÷ 1000; COP/kg con el **promedio anual de la TRM** (solo años con TRM, desde 1991).
- Alimenta el globo (`GET /api/internacional/paises`) y el detalle por país.
- **Advertencia en la interfaz:** es el precio **al productor** de cada país, con rezago de unos dos años. No es comparable con precios mayoristas ni de bolsa.
