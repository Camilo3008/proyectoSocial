// Lista explícita de entidades (sin globs: funciona igual en src/ con Vitest y en dist/).
import { UsuarioAdmin } from '../auth/entities/usuario-admin.entity.js';
import { Fuente } from '../catalogo/entities/fuente.entity.js';
import { Mercado } from '../catalogo/entities/mercado.entity.js';
import { Pais } from '../catalogo/entities/pais.entity.js';
import { ProductoFuente } from '../catalogo/entities/producto-fuente.entity.js';
import { Producto } from '../catalogo/entities/producto.entity.js';
import { IngestaEjecucion } from '../ingesta/entities/ingesta-ejecucion.entity.js';
import { ObservacionPrecio } from '../precios/entities/observacion-precio.entity.js';
import { TasaCambio } from '../tasas/entities/tasa-cambio.entity.js';

export const ENTIDADES: (new () => object)[] = [
  Producto,
  Fuente,
  Pais,
  Mercado,
  ProductoFuente,
  ObservacionPrecio,
  TasaCambio,
  IngestaEjecucion,
  UsuarioAdmin,
];
