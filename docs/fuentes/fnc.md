# Federación Nacional de Cafeteros (`fnc`)

Verificada el **2026-11-16**.

- **Entidad:** Federación Nacional de Cafeteros de Colombia (FNC).
- **Sitio:** https://federaciondecafeteros.org/
- **Dónde se publica el precio:**
  1. Encabezado de todas las páginas del sitio: "Precio interno de referencia", "Bolsa de NY" y "Tasa de cambio", cada uno con su fecha.
  2. Boletín diario en PDF enlazado desde el encabezado: `https://federaciondecafeteros.org/wp-content/uploads/2026/03/precio_cafe.pdf`. La URL es fija (la carpeta `2026/03` no cambia), pero el archivo **se regenera a diario**: el que se revisó el 2026-11-16 fue generado el 2026-11-13 a las 18:54 por "SAP NetWeaver 750".
- **Formato del boletín:** PDF 1.3 de una página con texto extraíble (no es una imagen). Contiene:
  - fecha ("Noviembre 13 / 2026");
  - **precio interno de referencia** por carga de 125 kg de café pergamino seco FR 94, en COP;
  - cierre del contrato C en Nueva York, en centavos de USD por libra;
  - precio de la pasilla contenida en el pergamino (COP/kg);
  - precios de referencia por sucursal de Almacafé (carga, kilo y arroba), **incluida Neiva**;
  - tabla por factor de rendimiento y descuentos por taza.
- **Frecuencia:** diaria, en días hábiles.
- **robots.txt:** `User-agent: * / Disallow:` (no restringe nada).

## Términos de uso (determinantes)

Fuente: https://federaciondecafeteros.org/terminos-y-condiciones-de-uso-contenido-web/ (revisados el 2026-11-16).

- "el contenido de la página institucional FNC es sólo para **uso personal y no para fines comerciales**."
- "No está autorizado para usar **robots, spiders, o cualquier otra clase de software o dispositivo automático**, o proceso manual para controlar o copiar la Página o el Contenido, **sin previa autorización otorgada, por escrito**, por el Proveedor."
- "El usuario no está autorizado para copiar, modificar, reproducir, **publicar, distribuir**, presentar, ni transmitir todo o parte de la Página Institucional FNC con fines comerciales, o sin ellos."

## Decisión de implementación

- **No hay adapter automático para la FNC.** Los términos prohíben la extracción automatizada sin autorización escrita, aunque el `robots.txt` lo permita.
- El precio se registra por **carga manual** del administrador (`POST /api/admin/precios`) con `fuente = fnc`, citando el boletín en `metadata.referencia`.
- **Riesgo legal pendiente:** los términos también restringen publicar el contenido. El precio interno de referencia es un dato público que la FNC difunde para los caficultores y que los medios reproducen a diario, pero la recomendación es **solicitar autorización escrita a la FNC** para publicarlo en AgroPrecios (y, si la otorgan, para automatizar la lectura del boletín). Ver la pregunta abierta 1 de `docs/PROYECTO.md`.
- No se guarda el PDF de la FNC en el repositorio.

## Productos y códigos (para la carga manual)

| Dato del boletín | Producto | Presentación | Unidad | Moneda | Mercado |
|---|---|---|---|---|---|
| Precio total por carga de 125 kg de pergamino seco FR 94 | `cafe` | `pergamino seco` | `carga 125 kg` | COP | (ninguno: referencia nacional) |
| Cierre contrato C Nueva York | `cafe` | `verde arábica (contrato C)` | `USc/lb` | USD | Bolsa de Nueva York (ICE) |

## Notas

- La "Tasa de cambio" que publica la FNC (3.315,56 el 2026-11-13) es la que usa para su cálculo y **no es la TRM oficial** (3.301,91 ese mismo día). AgroPrecios usa la TRM de la Superfinanciera (`docs/fuentes/trm.md`).
- El boletín trae precios por sucursal de Almacafé (por ejemplo, Neiva). Serían muy útiles para Pitalito si la FNC autoriza su uso.
