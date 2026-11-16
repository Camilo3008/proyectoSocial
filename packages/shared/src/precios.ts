import { type Frecuencia } from './catalogo.js';

interface Referencia {
  slug: string;
  nombre: string;
}

/** POST /api/admin/precios (cuerpo): carga manual de una observación. */
export interface CargaManualPrecioDto {
  /** Slug del producto (cafe, platano, …). */
  producto: string;
  /** Slug de la fuente de la que se tomó el dato (fnc, manual, …). */
  fuente: string;
  mercadoId?: number;
  paisIso3?: string;
  /** AAAA-MM-DD; no puede ser futura. */
  fecha: string;
  /** Por defecto DIARIA. */
  periodicidad?: Frecuencia;
  /** Presentación ORIGINAL, p. ej. "pergamino seco". */
  presentacion: string;
  /** Valor ORIGINAL como texto decimal con punto, p. ej. "2075000". */
  valor: string;
  /** ISO 4217, p. ej. COP. */
  moneda: string;
  /** Unidad ORIGINAL; debe ser una unidad conocida (kg, carga 125 kg, arroba, lb, USc/lb). */
  unidad: string;
  /** De dónde se tomó el dato, p. ej. "Boletín FNC del 13/11/2026". */
  referencia?: string;
}

/** PATCH /api/admin/precios/:id/anular (cuerpo). */
export interface AnulacionPrecioDto {
  motivo: string;
}

/** Observación de precio tal como la ve el administrador. */
export interface ObservacionPrecioDto {
  id: string;
  producto: Referencia;
  fuente: Referencia;
  mercado: { id: number; nombre: string } | null;
  paisIso3: string | null;
  fecha: string;
  periodicidad: Frecuencia;
  presentacion: string;
  valor: string;
  moneda: string;
  unidad: string;
  valorCopKg: string | null;
  valorUsdKg: string | null;
  anulado: boolean;
  motivoAnulacion: string | null;
  creadoEn: string;
}

/** Variación frente al dato anterior comparable (misma fuente, mercado y presentación). */
export interface VariacionDto {
  absoluta: string;
  /** null si el valor anterior es cero. */
  porcentaje: string | null;
  fechaAnterior: string;
}

/** Un precio de referencia con su procedencia. */
export interface PrecioReferenciaDto {
  fuente: Referencia;
  mercado: { nombre: string } | null;
  fecha: string;
  presentacion: string;
  valor: string;
  moneda: string;
  unidad: string;
  valorCopKg: string | null;
  variacion: VariacionDto | null;
}

/** Dato secundario de un producto (p. ej. el cierre de Nueva York para el café). */
export interface ComplementoPrecioDto extends PrecioReferenciaDto {
  etiqueta: string;
}

export interface PrecioHoyItemDto extends PrecioReferenciaDto {
  producto: Referencia;
  complementos: ComplementoPrecioDto[];
}

/** GET /api/precios/hoy */
export interface PreciosHoyDto {
  /** Momento en que la API generó la respuesta (ISO 8601). */
  generadoEn: string;
  /** Fecha de hoy en Bogotá (AAAA-MM-DD), para saber si un dato es del día. */
  hoy: string;
  items: PrecioHoyItemDto[];
  /** Productos activos sin ningún dato todavía. */
  sinDatos: Referencia[];
  /** TRM vigente hoy, con su fuente y licencia. */
  trm: {
    fecha: string;
    valor: string;
    fuente: Referencia & { licencia: string | null };
  } | null;
}
