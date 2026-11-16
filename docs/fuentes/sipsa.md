# DANE – SIPSA, precios mayoristas (`sipsa`)

Verificada el **2026-11-16**.

- **Entidad:** Departamento Administrativo Nacional de Estadística (DANE), Sistema de Información de Precios y Abastecimiento del Sector Agropecuario (SIPSA).
- **Página oficial del servicio:** https://www.dane.gov.co/index.php/estadisticas-por-tema/agropecuario/sistema-de-informacion-de-precios-sipsa/servicio-web-para-consulta-de-la-base-de-datos-de-sipsa
  - "Precios mayoristas de los principales productos agrícolas registrados en las principales centrales de abastos del país. Los datos diarios y semanales se actualizan a las 2:00 p.m. del correspondiente día; mientras que los datos mensuales son actualizados los días 8 del mes."
- **WSDL:** `https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService?WSDL` (también responde por `http://`). Esquema: `?xsd=1`.
- **Protocolo:** SOAP 1.2, estilo *document/literal*, `Content-Type: application/soap+xml; charset=utf-8`, sin `SOAPAction`. Servidor Oracle JAX-WS 2.1.5 / WebLogic.
- **Endpoint:** `https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService`.
- **Autenticación / límites:** ninguno documentado.
- **robots.txt:** `appweb.dane.gov.co` no tiene (responde 404). El de `www.dane.gov.co` no restringe estos recursos.

## Términos de uso

https://www.dane.gov.co/index.php/terminos-y-condiciones (revisados el 2026-11-16):

> 2. Se autoriza el uso, aprovechamiento, transformación y análisis de la información contenida en esta portal, siempre y cuando se haga la siguiente cita textual: "Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co".

**Obligación:** mostrar esa cita textual donde se usen datos de SIPSA. El DANE puede cambiar estas condiciones sin aviso, así que hay que revisarlas periódicamente.

## Operaciones del WSDL (verificadas en el WSDL y el XSD el 2026-11-16)

| Operación | Parámetros (XSD) | Respuesta (tipo XSD) | Contenido | Probada |
|---|---|---|---|---|
| `promediosSipsaParcial` | ninguno | `sipsaPromediosMayoristasParcial[]` | **Precio diario por mercado mayorista**: mínimo, máximo y promedio en COP/kg, con municipio y departamento. Desde 2020-02-01 | ✅ **316 MB**, 711.222 registros, 95 s |
| `promediosSipsaCiudad` | ninguno | `sipsaPromMayoristasCiudad[]` (`ciudad`, `codProducto`, `producto`, `fechaCaptura`, `precioPromedio`, …) | Precio promedio diario por ciudad. Desde 2020-02-03 | ✅ 116 MB, 396.188 registros, 41 s |
| `promediosSipsaSemanaMadr` | ninguno | `sipsaMayoristasSemanaMadr[]` (`artiId`, `fuenNombre`, `fechaIni`, `minimoKg`, `maximoKg`, `promedioKg`, …) | Promedios semanales por mercado | No (solo esquema) |
| `promediosSipsaMesMadr` | ninguno | Promedios mensuales | | No (solo esquema) |
| `promedioAbasSipsaMesMadr` | ninguno | `sipsaAbastecimientosMesMadr[]` (`cantidadTon`, …) | Abastecimiento mensual | No (solo esquema) |
| `consultarInsumosSipsaMesMadr` | `arg0: xs:int` (significado no documentado en el esquema) | `sipsaInsumosMesMadr[]` | Precios de insumos | No (solo esquema) |

Ninguna de las operaciones de precios acepta filtros: **todas devuelven el histórico completo**.

### Ejemplo de petición (real, la que usa el adapter)

```http
POST https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService
Content-Type: application/soap+xml; charset=utf-8
User-Agent: AgroPrecios/0.1 (proyecto social; precios agricolas de referencia)

<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ser="http://servicios.sipsa.co.gov.dane/">
  <soap:Body><ser:promediosSipsaParcial/></soap:Body>
</soap:Envelope>
```

La respuesta es `HTTP 200`, `application/soap+xml;charset="utf-8"`, con `<S:Envelope><S:Body><ns2:promediosSipsaParcialResponse>` y un `<return>` por registro (ejemplo más abajo).

## Implementación

- **Sin el paquete `soap`:** la petición se arma a mano con `fetch` (el sobre de arriba).
- **Parser:** [`saxes`](https://www.npmjs.com/package/saxes) 6.x (ISC). Es SAX en streaming: procesa la respuesta a medida que llega, sin tener los 316 MB en memoria; cumple estrictamente el estándar XML, trae tipos de TypeScript y tiene una sola dependencia pequeña (`xmlchars`). Solo se usa en la API (no pesa en el frontend). Se descartaron `fast-xml-parser` (≈1,3 MB, arma el documento completo en memoria) y `htmlparser2` (orientado a HTML).
- El adapter descarta durante la lectura los artículos sin mapeo y los datos anteriores a la ventana (`SIPSA_DIAS_VENTANA`, 45 días por defecto). El histórico completo se carga una vez con `POST /api/admin/ingesta/sipsa?desde=2020-01-01`.
- Los mercados se identifican por `fuenId` (`mercado.codigo_externo`), no por el nombre. En la respuesta real hay **26 nombres para 23 códigos**: algunos mercados cambiaron de nombre (p. ej. "Cali, Santa Helena" → "Cali, Santa Elena") y por código no se duplican.

## Primera carga real (2026-11-16)

`POST /api/admin/ingesta/sipsa?desde=2020-01-01`: estado `OK`, 50.114 observaciones (plátano hartón verde, guineo y banano), **23 mercados creados**, 1 min 45 s.

**El adapter usa `promediosSipsaParcial`**, porque es la única que identifica el mercado mayorista (central de abastos).

### Campos de `promediosSipsaParcial` (tipo `sipsaPromediosMayoristasParcial`)

| Campo | Tipo | Ejemplo real | Uso |
|---|---|---|---|
| `artiNombre` | string | `Plátano hartón verde` | Nombre del artículo |
| `idArtiSemana` | decimal | `35` | **Código del artículo** (`producto_fuente.codigo_externo`) |
| `grupNombre` | string | `TUBERCULOS, RAICES Y PLATANOS` | metadata |
| `fuenId` / `futiId` | decimal | `22` | Código del mercado (metadata) |
| `fuenNombre` | string | `Neiva, Surabastos` | **Mercado** |
| `muniId` / `muniNombre` | string | `41001` / `NEIVA` | Municipio (DIVIPOLA) |
| `deptNombre` | string | `HUILA` | Departamento |
| `enmaFecha` | dateTime | `2026-11-13T00:00:00-05:00` | **Fecha del dato** (hora de Colombia) |
| `minimoKg` / `maximoKg` | decimal | `2000` / `2200` | metadata |
| `promedioKg` | decimal | `2133` | **Valor** (COP por kg) |

Los precios mayoristas de SIPSA incluyen IVA (ficha metodológica del DANE). Son precios **mayoristas**, no lo que recibe el productor en finca (docs/PROYECTO.md §7.1).

## Productos y códigos (verificados en la respuesta real)

| Producto (slug) | Código `idArtiSemana` | Nombre SIPSA | Presentación en AgroPrecios | Unidad | Moneda |
|---|---|---|---|---|---|
| `platano` | `35` | Plátano hartón verde | `hartón verde` | `kg` | COP |
| `platano` | `34` | Plátano guineo | `guineo` | `kg` | COP |
| `banano` | `15` | Banano* | `banano` | `kg` | COP |
| `pitaya` | — | **No existe en el servicio web** | — | — | — |
| `cacao` | — | **No existe en el servicio web** | — | — | — |

El asterisco de "Banano*" viene así de la fuente; su significado no está documentado en el servicio web. Se conserva en `metadata.nombreSipsa`.

(`promediosSipsaCiudad` usa otros códigos para los mismos artículos: 13, 31 y 32. No se usa.)

## Mercados cercanos a Pitalito con datos

| Mercado (`fuenNombre`) | Municipio | Departamento | Último dato de interés |
|---|---|---|---|
| **Neiva, Surabastos** | NEIVA (41001) | HUILA | 2026-11-13 (banano, plátano guineo y hartón verde) |
| Popayán, Plaza de mercado del barrio Bolívar | POPAYÁN (19001) | CAUCA | 2026-11-13 (banano); hartón verde 2026-11-04 |

En total hay 26 mercados (Bogotá Corabastos, Cali Santa Helena, Medellín Central Mayorista, etc.). No hay datos los domingos.

## Ejemplo de respuesta (real)

```xml
<return><artiNombre>Plátano hartón verde</artiNombre><deptNombre>HUILA</deptNombre><enmaFecha>2026-11-13T00:00:00-05:00</enmaFecha><fuenId>22</fuenId><fuenNombre>Neiva, Surabastos</fuenNombre><futiId>22</futiId><grupNombre>TUBERCULOS, RAICES Y PLATANOS</grupNombre><idArtiSemana>35</idArtiSemana><maximoKg>2200</maximoKg><minimoKg>2000</minimoKg><muniId>41001</muniId><muniNombre>NEIVA</muniNombre><promedioKg>2133</promedioKg></return>
```

Fixture: `apps/api/test/fixtures/sipsa/promedios-parcial-recorte.xml`. Es un recorte de la respuesta real del 2026-11-16: el sobre SOAP original y 26 registros sin modificar (Neiva y Bogotá, artículos 15, 34 y 35, del 9 al 13 de noviembre, más registros que el adapter debe ignorar).

## Notas y riesgos

- **Tamaño:** cada consulta descarga todo el histórico (~316 MB y ~95 s). El adapter debe procesar la respuesta **en streaming** (sin cargarla entera en memoria), filtrar por los códigos mapeados y por fecha, y tener un *timeout* amplio. Es una sola descarga por ejecución y se programa una vez al día, después de las 2:00 p. m.
- **Disponibilidad:** el servicio se publicó "en el marco de la emergencia sanitaria" (2020) y el DANE no garantiza su continuidad. Si desaparece, la ejecución queda en `ERROR` y se ve en `/api/fuentes`.
- **Pitaya y cacao** no están en el servicio web. Habría que buscar otra fuente (por ejemplo, los anexos de los boletines SIPSA o FAOSTAT para el contexto internacional) y verificarla por separado.
