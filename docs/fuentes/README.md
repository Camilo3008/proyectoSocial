# Fichas de fuentes de datos

Antes de escribir el adapter de una fuente se crea aquí `<slug>.md` con la
información **verificada** (CLAUDE.md, "Ingesta de datos"). Nada de esto se
inventa: si algo no se pudo verificar, se escribe "Por verificar" y el adapter
queda como stub con `TODO(verificar)`.

| Slug | Ficha | Estado |
|---|---|---|
| `fnc` | [fnc.md](fnc.md) | Verificada 2026-11-16 · sin adapter (los términos prohíben la extracción automatizada): carga manual |
| `sipsa` | — | Por verificar |
| `worldbank` | — | Por verificar |
| `faostat` | — | Por verificar |
| `trm` | [trm.md](trm.md) | Verificada 2026-11-16 · adapter automático |
| `manual` | No aplica | Carga desde el panel de administración |

## Plantilla

```markdown
# <Nombre de la fuente> (`<slug>`)

- **Entidad:**
- **URL del recurso (verificada el AAAA-MM-DD):**
- **Formato:** (JSON, CSV, XLSX, PDF, SOAP…)
- **Frecuencia de publicación:**
- **Licencia / términos de uso:** (enlace y resumen; ¿permite uso comercial? ¿exige atribución?)
- **robots.txt:** (qué permite)
- **Autenticación / límites:**

## Productos y códigos

| Producto (slug) | Código en la fuente | Presentación | Unidad | Moneda |
|---|---|---|---|---|

## Ejemplo de respuesta

(fragmento real; el archivo completo va en apps/api/test/fixtures/<slug>/)

## Notas y riesgos
```
