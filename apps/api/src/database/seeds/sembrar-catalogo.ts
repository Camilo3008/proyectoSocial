import bcrypt from 'bcryptjs';
import { type DataSource } from 'typeorm';
import { UsuarioAdmin } from '../../auth/entities/usuario-admin.entity.js';
import { Fuente } from '../../catalogo/entities/fuente.entity.js';
import { Mercado } from '../../catalogo/entities/mercado.entity.js';
import { Pais } from '../../catalogo/entities/pais.entity.js';
import { ProductoFuente } from '../../catalogo/entities/producto-fuente.entity.js';
import { Producto } from '../../catalogo/entities/producto.entity.js';
import { FUENTES } from './datos/fuentes.js';
import { MERCADOS } from './datos/mercados.js';
import { obtenerPaises } from './datos/paises.js';
import { PRODUCTO_FUENTE } from './datos/producto-fuente.js';
import { PRODUCTOS } from './datos/productos.js';

export interface AdminSemilla {
  email?: string;
  password?: string;
}

export interface ResumenSiembra {
  productos: number;
  fuentes: number;
  paises: number;
  mercados: number;
  codigosProducto: number;
  admin: 'creado' | 'existente' | 'omitido';
}

const COSTO_BCRYPT = 12;

/**
 * Siembra el catálogo base. Es idempotente: se puede ejecutar varias veces.
 * - Productos, fuentes, países y mercados se insertan o actualizan por su clave natural.
 * - El administrador solo se crea si no existe (nunca se sobrescribe su contraseña).
 * Todo ocurre en una sola transacción.
 */
export async function sembrarCatalogo(
  dataSource: DataSource,
  admin: AdminSemilla,
): Promise<ResumenSiembra> {
  return dataSource.transaction(async (em) => {
    await em.upsert(Producto, PRODUCTOS, ['slug']);
    await em.upsert(Fuente, FUENTES, ['slug']);

    const paises = obtenerPaises();
    await em.upsert(Pais, paises, ['iso3']);
    // Después de los países: mercado.pais_iso3 es FK.
    await em.upsert(Mercado, MERCADOS, ['nombre', 'paisIso3']);

    // Códigos de producto por fuente (verificados en docs/fuentes).
    const idProducto = new Map((await em.find(Producto)).map((p) => [p.slug, p.id]));
    const idFuente = new Map((await em.find(Fuente)).map((f) => [f.slug, f.id]));
    await em.upsert(
      ProductoFuente,
      PRODUCTO_FUENTE.map((m) => ({
        productoId: idProducto.get(m.producto)!,
        fuenteId: idFuente.get(m.fuente)!,
        codigoExterno: m.codigoExterno,
        presentacion: m.presentacion,
        notas: m.notas,
      })),
      ['fuenteId', 'codigoExterno'],
    );

    let estadoAdmin: ResumenSiembra['admin'] = 'omitido';
    if (admin.email && admin.password) {
      const email = admin.email.trim().toLowerCase();
      const existente = await em.findOneBy(UsuarioAdmin, { email });
      if (existente) {
        estadoAdmin = 'existente';
      } else {
        await em.insert(UsuarioAdmin, {
          email,
          hashPassword: await bcrypt.hash(admin.password, COSTO_BCRYPT),
          activo: true,
        });
        estadoAdmin = 'creado';
      }
    }

    return {
      productos: PRODUCTOS.length,
      fuentes: FUENTES.length,
      paises: paises.length,
      mercados: MERCADOS.length,
      codigosProducto: PRODUCTO_FUENTE.length,
      admin: estadoAdmin,
    };
  });
}
