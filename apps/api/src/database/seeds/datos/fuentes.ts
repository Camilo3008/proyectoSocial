import { type Fuente } from '../../../catalogo/entities/fuente.entity.js';

type FuenteSemilla = Pick<Fuente, 'slug' | 'nombre' | 'tipo' | 'url' | 'licencia' | 'frecuencia'>;

/**
 * Fuentes de datos (docs/PROYECTO.md §7).
 *
 * TODO(verificar): las URL son las páginas institucionales de cada entidad, no
 * los endpoints de datos. La URL exacta del recurso, el formato y la licencia
 * se verifican y documentan en docs/fuentes/<slug>.md antes de escribir cada
 * adapter; hasta entonces la licencia queda en null ("por verificar").
 */
export const FUENTES: FuenteSemilla[] = [
  {
    slug: 'fnc',
    nombre: 'Federación Nacional de Cafeteros',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://federaciondecafeteros.org/',
    licencia: null,
    frecuencia: 'DIARIA',
  },
  {
    slug: 'sipsa',
    nombre: 'DANE – SIPSA (precios mayoristas)',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://www.dane.gov.co/',
    licencia: null,
    frecuencia: 'DIARIA',
  },
  {
    slug: 'worldbank',
    nombre: 'Banco Mundial – Commodity Price Data (Pink Sheet)',
    tipo: 'INTERNACIONAL',
    url: 'https://www.worldbank.org/',
    licencia: null,
    frecuencia: 'MENSUAL',
  },
  {
    slug: 'faostat',
    nombre: 'FAO – FAOSTAT (precios al productor)',
    tipo: 'INTERNACIONAL',
    url: 'https://www.fao.org/faostat/',
    licencia: null,
    frecuencia: 'ANUAL',
  },
  {
    slug: 'trm',
    nombre: 'TRM – Tasa Representativa del Mercado (datos.gov.co)',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://www.datos.gov.co/',
    licencia: null,
    frecuencia: 'DIARIA',
  },
  {
    slug: 'manual',
    nombre: 'Carga manual del administrador',
    tipo: 'MANUAL',
    url: null,
    licencia: null,
    // Sin frecuencia real (a demanda); el estado de esta fuente es siempre NO_APLICA.
    frecuencia: 'DIARIA',
  },
];
