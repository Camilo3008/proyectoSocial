import { type Fuente } from '../../../catalogo/entities/fuente.entity.js';

type FuenteSemilla = Pick<
  Fuente,
  'slug' | 'nombre' | 'descripcion' | 'tipo' | 'url' | 'licencia' | 'frecuencia'
>;

/**
 * Fuentes de datos (docs/PROYECTO.md §7).
 *
 * Las fuentes verificadas (ficha en docs/fuentes/<slug>.md) llevan su URL y su
 * licencia. TODO(verificar): sipsa y faostat todavía apuntan a la
 * página institucional y tienen la licencia en null ("Por verificar").
 */
export const FUENTES: FuenteSemilla[] = [
  {
    slug: 'fnc',
    nombre: 'Federación Nacional de Cafeteros',
    descripcion:
      'Precio interno de referencia del café pergamino seco por carga de 125 kg y cierre de la Bolsa de Nueva York. Lo registra a mano el administrador a partir del boletín diario de la FNC.',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://federaciondecafeteros.org/',
    licencia:
      'Términos de uso de la FNC: uso personal no comercial; no permiten la extracción automática sin autorización escrita.',
    frecuencia: 'DIARIA',
  },
  {
    slug: 'sipsa',
    nombre: 'DANE – SIPSA (precios mayoristas)',
    descripcion:
      'Precios mayoristas de alimentos en las principales centrales de abasto del país (plátano, banano, pitaya y otros).',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://www.dane.gov.co/',
    licencia: null,
    frecuencia: 'DIARIA',
  },
  {
    slug: 'worldbank',
    nombre: 'Banco Mundial – Commodity Price Data (Pink Sheet)',
    descripcion:
      'Precios internacionales mensuales en dólares de café arábica, café robusta, cacao y banano.',
    tipo: 'INTERNACIONAL',
    url: 'https://www.worldbank.org/en/research/commodity-markets',
    licencia: 'CC BY 4.0 – Banco Mundial, Commodity Price Data (The Pink Sheet)',
    frecuencia: 'MENSUAL',
  },
  {
    slug: 'faostat',
    nombre: 'FAO – FAOSTAT (precios al productor)',
    descripcion:
      'Precio que reciben los productores en cada país, por producto y año. Alimenta el globo terráqueo.',
    tipo: 'INTERNACIONAL',
    url: 'https://www.fao.org/faostat/',
    licencia: null,
    frecuencia: 'ANUAL',
  },
  {
    slug: 'trm',
    nombre: 'TRM – Superintendencia Financiera (datos.gov.co)',
    descripcion:
      'Tasa de cambio oficial del dólar en pesos colombianos (TRM). Se usa para convertir precios internacionales a pesos.',
    tipo: 'OFICIAL_NACIONAL',
    url: 'https://www.datos.gov.co/Econom-a-y-Finanzas/Tasa-de-Cambio-Representativa-del-Mercado-TRM/32sa-8pi3',
    licencia: 'CC BY-SA 4.0 – Superintendencia Financiera de Colombia',
    frecuencia: 'DIARIA',
  },
  {
    slug: 'manual',
    nombre: 'Carga manual del administrador',
    descripcion:
      'Datos que no tienen una fuente automática o correcciones, siempre con registro de quién, cuándo y por qué.',
    tipo: 'MANUAL',
    url: null,
    licencia: null,
    frecuencia: 'A_DEMANDA',
  },
];
