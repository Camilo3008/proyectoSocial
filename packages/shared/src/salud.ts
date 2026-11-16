export type EstadoComponente = 'ok' | 'error';

/** GET /api/salud */
export interface SaludDto {
  estado: EstadoComponente;
  /** Momento de la verificación (ISO 8601). */
  verificadoEn: string;
  version: string;
  baseDatos: {
    estado: EstadoComponente;
    latenciaMs: number | null;
  };
}
