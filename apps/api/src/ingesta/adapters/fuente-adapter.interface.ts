import { type Frecuencia } from '@agroprecios/shared';

/**
 * Observación tal como la entrega una fuente, ANTES de normalizar.
 * Los adapters solo descargan y parsean: no tocan la base de datos ni
 * resuelven ids. El IngestaService la normaliza (código externo -> producto,
 * mercado, país), calcula los valores derivados y hace el upsert idempotente.
 */
export interface ObservacionPrecioCruda {
  /** Código del producto en la fuente; se mapea con la tabla producto_fuente. */
  codigoExterno: string;
  /** Nombre del mercado tal como lo reporta la fuente (precios nacionales). */
  mercado?: {
    nombre: string;
    municipio?: string;
    departamento?: string;
  };
  /** ISO 3166-1 alfa-3 (precios por país, p. ej. FAOSTAT). */
  paisIso3?: string;
  /** Fecha del dato YYYY-MM-DD. Para series mensuales/anuales: primer día del periodo. */
  fecha: string;
  periodicidad: Frecuencia;
  /** Presentación ORIGINAL ("pergamino seco", "verde arábica", …). */
  presentacion: string;
  /** Valor ORIGINAL como texto decimal (nunca number para dinero). */
  valor: string;
  /** ISO 4217. */
  moneda: string;
  /** Unidad ORIGINAL ("carga 125 kg", "kg", "lb", …). */
  unidad: string;
  /** Datos adicionales de la fuente útiles para trazabilidad. */
  metadata?: Record<string, unknown>;
}

/** Tasa de cambio tal como la entrega una fuente (p. ej. TRM). */
export interface TasaCambioCruda {
  /** YYYY-MM-DD */
  fecha: string;
  monedaOrigen: string;
  monedaDestino: string;
  /** Texto decimal. */
  valor: string;
}

/** Parámetros de una ejecución. */
export interface ContextoIngesta {
  /** Rango opcional (YYYY-MM-DD) para fuentes que lo soporten. */
  desde?: string;
  hasta?: string;
  /** Permite cancelar la descarga (timeouts, apagado de la app). */
  signal?: AbortSignal;
}

export interface ResultadoAdapter {
  observaciones: ObservacionPrecioCruda[];
  /** Solo para fuentes de tasas de cambio (trm). */
  tasas?: TasaCambioCruda[];
  /** SHA-256 (hex) del payload descargado; se guarda en la bitácora. */
  payloadHash: string;
}

/**
 * Contrato de cada fuente de datos (ingesta/adapters/<slug>.adapter.ts).
 *
 * Reglas (CLAUDE.md, "Ingesta de datos"):
 * - Una sola descarga por ejecución, con User-Agent identificable, respetando
 *   términos de uso y robots.txt.
 * - No inventar URLs, códigos ni formatos: la fuente se verifica y se documenta
 *   en docs/fuentes/<slug>.md antes de implementar el adapter.
 * - Pruebas unitarias con fixtures reales en test/fixtures/<slug>/, sin red.
 */
export interface FuenteAdapter {
  /** Debe coincidir con fuente.slug en la base de datos. */
  readonly slug: string;
  ejecutar(contexto: ContextoIngesta): Promise<ResultadoAdapter>;
}

/** Token de inyección: arreglo con todos los adapters registrados. */
export const FUENTE_ADAPTERS = Symbol('FUENTE_ADAPTERS');
