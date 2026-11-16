import { type FuenteDatoDto, type ReferenciaDto } from './precios.js';

/** Un mes de una serie internacional. */
export interface PuntoInternacionalDto {
  /** Primer día del mes (AAAA-MM-01). */
  fecha: string;
  valorUsdKg: string;
  /** Con el promedio mensual de la TRM; null si no hay TRM para ese mes. */
  valorCopKg: string | null;
}

export interface SerieInternacionalDto {
  /** P. ej. "verde arábica (indicador ICO)". */
  presentacion: string;
  items: PuntoInternacionalDto[];
}

/** Promedio mensual del precio nacional de referencia, para comparar. */
export interface ReferenciaNacionalDto {
  fuente: FuenteDatoDto;
  mercado: string | null;
  presentacion: string;
  items: { fecha: string; valorCopKg: string }[];
}

/** GET /api/internacional/commodities */
export interface CommoditiesDto {
  producto: ReferenciaDto;
  fuente: FuenteDatoDto;
  desde: string;
  hasta: string;
  series: SerieInternacionalDto[];
  /** null si el producto no tiene precio nacional (p. ej. cacao). */
  nacional: ReferenciaNacionalDto | null;
}

/** Precio al productor de un país en un año (FAOSTAT). */
export interface PaisPrecioDto {
  iso3: string;
  iso2: string | null;
  nombre: string;
  valorUsdKg: string;
  /** Valor original de la fuente, en USD por tonelada. */
  valorUsdT: string;
  /** En moneda local por tonelada, tal como lo publica FAOSTAT (sin código de moneda). */
  valorMonedaLocalT: string | null;
  valorCopKg: string | null;
  /** Bandera de calidad de FAOSTAT (A oficial, X externa, …). */
  bandera: string | null;
}

/** GET /api/internacional/paises: valores por país para la coropleta del globo. */
export interface MapaPaisesDto {
  producto: ReferenciaDto;
  fuente: FuenteDatoDto;
  presentacion: string | null;
  /** Año mostrado (el pedido o el último con datos); null si no hay datos. */
  anio: number | null;
  aniosDisponibles: number[];
  /** Ordenados de mayor a menor precio. */
  items: PaisPrecioDto[];
}

/** GET /api/internacional/paises/:iso3: detalle y serie de un país. */
export interface DetallePaisDto {
  pais: { iso3: string; iso2: string | null; nombre: string; region: string | null };
  producto: ReferenciaDto;
  fuente: FuenteDatoDto;
  presentacion: string | null;
  serie: { anio: number; valorUsdKg: string; valorCopKg: string | null }[];
  ultimo: (PaisPrecioDto & { anio: number }) | null;
  /** Comparación con Colombia en el mismo año (null si falta alguno de los dos). */
  comparacionColombia: {
    anio: number;
    valorColombiaUsdKg: string;
    diferenciaPct: string | null;
  } | null;
}
