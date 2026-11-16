/** Cómo se disparó una ejecución de ingesta. */
export type DisparoIngesta = 'PROGRAMADO' | 'MANUAL';

/** Resultado de una ejecución de ingesta. */
export type EstadoIngesta = 'EN_CURSO' | 'OK' | 'PARCIAL' | 'ERROR';

/** Una fila de la bitácora (GET /api/admin/ingestas, POST /api/admin/ingesta/:fuente). */
export interface IngestaEjecucionDto {
  id: number;
  fuente: string;
  disparo: DisparoIngesta;
  inicio: string;
  fin: string | null;
  estado: EstadoIngesta;
  leidos: number;
  insertados: number;
  actualizados: number;
  /** Mercados creados automáticamente en esta ejecución. */
  mercadosNuevos: number;
  /** Error o advertencias (estado ERROR o PARCIAL). */
  error: string | null;
  payloadHash: string | null;
}
