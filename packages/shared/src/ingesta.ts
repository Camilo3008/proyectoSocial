/** Cómo se disparó una ejecución de ingesta. */
export type DisparoIngesta = 'PROGRAMADO' | 'MANUAL';

/** Resultado de una ejecución de ingesta. */
export type EstadoIngesta = 'EN_CURSO' | 'OK' | 'PARCIAL' | 'ERROR';
