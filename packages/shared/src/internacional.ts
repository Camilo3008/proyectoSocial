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
