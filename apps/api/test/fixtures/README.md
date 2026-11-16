# Fixtures de fuentes

Respuestas **reales** guardadas para probar los adapters sin red. Cada carpeta corresponde al `slug` de una fuente y a su ficha en `docs/fuentes/<slug>.md`.

| Carpeta | Archivo | Origen | Descargado | Licencia |
|---|---|---|---|---|
| `trm/` | `ultimas-40.json` | `https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde DESC&$limit=40` | 2026-11-16 | CC BY-SA 4.0 – Superintendencia Financiera de Colombia |
| `sipsa/` | `promedios-parcial-recorte.xml` | Recorte de `promediosSipsaParcial` (SOAP, `https://appweb.dane.gov.co/sipsaWS/SrvSipsaUpraBeanService`): sobre original y 26 registros sin modificar | 2026-11-16 | DANE: uso autorizado citando "Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co" |
| `worldbank/` | `CMO-Historical-Data-Monthly-2026-11-03.xlsx` | Archivo completo sin modificar: `https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx` (Last-Modified 2026-11-03) | 2026-11-16 | CC BY 4.0 – Banco Mundial, Commodity Price Data (The Pink Sheet) |
