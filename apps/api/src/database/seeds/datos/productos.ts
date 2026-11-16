import { type Producto } from '../../../catalogo/entities/producto.entity.js';

type ProductoSemilla = Pick<Producto, 'slug' | 'nombre' | 'descripcion' | 'unidadBase'>;

/**
 * Catálogo inicial de productos (docs/PROYECTO.md §1.1). Plátano y banano se
 * registran por separado porque las fuentes los reportan como artículos distintos.
 */
export const PRODUCTOS: ProductoSemilla[] = [
  {
    slug: 'cafe',
    nombre: 'Café',
    descripcion:
      'Café colombiano. La referencia nacional es el café pergamino seco por carga de 125 kg.',
    unidadBase: 'kg',
  },
  {
    slug: 'platano',
    nombre: 'Plátano',
    descripcion: 'Plátano de cocción (hartón, dominico y otras variedades).',
    unidadBase: 'kg',
  },
  {
    slug: 'banano',
    nombre: 'Banano',
    descripcion: 'Banano de consumo en fresco.',
    unidadBase: 'kg',
  },
  {
    slug: 'cacao',
    nombre: 'Cacao',
    descripcion: 'Cacao en grano.',
    unidadBase: 'kg',
  },
  {
    slug: 'pitaya',
    nombre: 'Pitaya',
    descripcion: 'Fruta de pitaya.',
    unidadBase: 'kg',
  },
];
