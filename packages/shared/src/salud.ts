import { type EstadoFuente } from './catalogo.js';

export type EstadoComponente = 'ok' | 'error';

/** Estado de la ingesta de una fuente (el mismo cálculo de GET /api/fuentes). */
export interface SaludFuenteDto {
  slug: string;
  estado: EstadoFuente;
  /** Fin (ISO 8601) de la última ingesta con estado OK, o null. */
  ultimaIngestaExitosa: string | null;
}

/** GET /api/salud */
export interface SaludDto {
  /** Solo depende de la base de datos: una fuente atrasada no tumba la salud de la API. */
  estado: EstadoComponente;
  /** Momento de la verificación (ISO 8601). */
  verificadoEn: string;
  version: string;
  baseDatos: {
    estado: EstadoComponente;
    latenciaMs: number | null;
  };
  /** Vacío si la base de datos no responde. */
  fuentes: SaludFuenteDto[];
}
