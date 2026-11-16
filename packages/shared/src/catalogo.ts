/** Tipo de fuente de datos. */
export type TipoFuente = 'OFICIAL_NACIONAL' | 'INTERNACIONAL' | 'MANUAL';

/** Frecuencia de publicación esperada de una fuente (y periodicidad de una observación). */
export type Frecuencia = 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'ANUAL';

/** Tipo de mercado. */
export type TipoMercado = 'MAYORISTA' | 'BOLSA' | 'REFERENCIA' | 'LOCAL';

/**
 * Estado de una fuente según su última ingesta:
 * - AL_DIA: la última ingesta exitosa está dentro de la frecuencia esperada.
 * - ATRASADA: la última ingesta exitosa es más antigua de lo esperado.
 * - ERROR: la última ejecución terminó con error.
 * - SIN_DATOS: nunca ha tenido una ingesta exitosa.
 * - NO_APLICA: fuente manual, sin ingesta automática.
 */
export type EstadoFuente = 'AL_DIA' | 'ATRASADA' | 'ERROR' | 'SIN_DATOS' | 'NO_APLICA';

/** GET /api/productos */
export interface ProductoDto {
  slug: string;
  nombre: string;
  descripcion: string | null;
  unidadBase: string;
}

/** GET /api/fuentes */
export interface FuenteDto {
  slug: string;
  nombre: string;
  tipo: TipoFuente;
  url: string | null;
  /** null mientras la licencia no se haya verificado y documentado en docs/fuentes. */
  licencia: string | null;
  frecuencia: Frecuencia;
  /** Fin (ISO 8601) de la última ingesta con estado OK, o null si nunca la hubo. */
  ultimaIngestaExitosa: string | null;
  estado: EstadoFuente;
}
