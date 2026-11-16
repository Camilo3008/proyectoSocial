import { type EstadoFuente, type Frecuencia, type TipoFuente } from '@agroprecios/shared';

/** Tono visual de un estado. Siempre va acompañado de texto (no solo color). */
export type Tono = 'ok' | 'aviso' | 'error' | 'neutro';

export const ESTADO_FUENTE: Record<EstadoFuente, { texto: string; tono: Tono }> = {
  AL_DIA: { texto: 'Al día', tono: 'ok' },
  ATRASADA: { texto: 'Atrasada', tono: 'aviso' },
  ERROR: { texto: 'Con error', tono: 'error' },
  SIN_DATOS: { texto: 'Sin datos todavía', tono: 'neutro' },
  NO_APLICA: { texto: 'Carga manual', tono: 'neutro' },
};

export const FRECUENCIA: Record<Frecuencia, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  ANUAL: 'Anual',
};

export const TIPO_FUENTE: Record<TipoFuente, string> = {
  OFICIAL_NACIONAL: 'Oficial nacional',
  INTERNACIONAL: 'Internacional',
  MANUAL: 'Manual',
};
