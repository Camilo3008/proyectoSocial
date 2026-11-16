import { type Mercado } from '../../../catalogo/entities/mercado.entity.js';

type MercadoSemilla = Pick<
  Mercado,
  'nombre' | 'tipo' | 'municipio' | 'departamento' | 'paisIso3' | 'lat' | 'lng'
>;

/** Mercados de referencia. Los mayoristas de SIPSA se agregan al verificar esa fuente. */
export const MERCADOS: MercadoSemilla[] = [
  {
    // Cierre del contrato C de café arábica (docs/fuentes/fnc.md).
    nombre: 'Bolsa de Nueva York (ICE)',
    tipo: 'BOLSA',
    municipio: 'Nueva York',
    departamento: null,
    paisIso3: 'USA',
    lat: null,
    lng: null,
  },
];

export const MERCADO_BOLSA_NY = MERCADOS[0]!.nombre;
