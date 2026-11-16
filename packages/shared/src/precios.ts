import { type Frecuencia } from './catalogo.js';

export interface ReferenciaDto {
  slug: string;
  nombre: string;
}
type Referencia = ReferenciaDto;

/** Fuente de un dato, con la cita que su licencia exige mostrar (si la hay). */
export interface FuenteDatoDto extends ReferenciaDto {
  /** P. ej. SIPSA: "Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co". */
  cita: string | null;
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
  fuente: FuenteDatoDto;
  mercado: { id: number; nombre: string } | null;
  fecha: string;
  /** DIARIA, SEMANAL, MENSUAL o ANUAL (los internacionales son mensuales). */
  periodicidad: Frecuencia;
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

/** Una serie de precios disponible para un producto (GET /api/precios/series). */
export interface SerieDisponibleDto {
  fuente: FuenteDatoDto;
  mercado: { id: number; nombre: string; departamento: string | null } | null;
  presentacion: string;
  unidad: string;
  moneda: string;
  /** Primera y última fecha con datos. */
  desde: string;
  hasta: string;
  cantidad: number;
  /** true para la serie que usa la pantalla "Hoy" (la que se muestra por defecto). */
  predeterminada: boolean;
}

export interface PuntoSerieDto {
  fecha: string;
  valor: string;
}

/** GET /api/precios/serie */
export interface SeriePrecioDto {
  producto: Referencia;
  fuente: FuenteDatoDto;
  mercado: { id: number; nombre: string } | null;
  presentacion: string;
  unidad: string;
  moneda: string;
  desde: string;
  hasta: string;
  items: PuntoSerieDto[];
  /** Mínimo, máximo y promedio del rango; null si no hay datos. */
  resumen: { minimo: string; maximo: string; promedio: string; cantidad: number } | null;
}

/** Un mercado en el comparativo nacional. */
export interface ComparativoItemDto {
  mercado: { id: number; nombre: string; departamento: string | null };
  valor: string;
  /** Diferencia porcentual frente al mercado de referencia; null si no hay referencia. */
  diferenciaPct: string | null;
  esReferencia: boolean;
}

/** GET /api/precios/comparativo */
export interface ComparativoDto {
  producto: Referencia;
  presentacion: string;
  unidad: string;
  moneda: string;
  /** Fecha comparada (la pedida o la última con datos); null si no hay datos. */
  fecha: string | null;
  fuente: FuenteDatoDto | null;
  /** Mercado de referencia de la región (el más cercano a Pitalito con dato ese día). */
  referencia: { mercadoId: number; nombre: string; valor: string } | null;
  /** Ordenados de mayor a menor precio. */
  items: ComparativoItemDto[];
}
