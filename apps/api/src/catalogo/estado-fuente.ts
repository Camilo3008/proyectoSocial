import {
  type EstadoFuente,
  type EstadoIngesta,
  type Frecuencia,
  type TipoFuente,
} from '@agroprecios/shared';

const MS_POR_DIA = 86_400_000;

/**
 * Días que pueden pasar desde la última ingesta exitosa antes de considerar
 * atrasada una fuente. Incluyen holgura para fines de semana, festivos y el
 * rezago normal de publicación de cada frecuencia.
 */
export const DIAS_TOLERANCIA: Record<Frecuencia, number> = {
  DIARIA: 4,
  SEMANAL: 10,
  MENSUAL: 45,
  ANUAL: 400,
};

export interface DatosEstadoFuente {
  tipo: TipoFuente;
  frecuencia: Frecuencia;
  ultimaIngestaExitosa: Date | null;
  /** Estado de la última ejecución terminada (excluye EN_CURSO). */
  ultimoEstado: EstadoIngesta | null;
}

/** Calcula el estado de una fuente para la página de transparencia (RF-06). */
export function calcularEstadoFuente(datos: DatosEstadoFuente, ahora: Date): EstadoFuente {
  if (datos.tipo === 'MANUAL') {
    return 'NO_APLICA';
  }
  if (datos.ultimoEstado === 'ERROR') {
    return 'ERROR';
  }
  if (!datos.ultimaIngestaExitosa) {
    return 'SIN_DATOS';
  }
  const dias = (ahora.getTime() - datos.ultimaIngestaExitosa.getTime()) / MS_POR_DIA;
  return dias > DIAS_TOLERANCIA[datos.frecuencia] ? 'ATRASADA' : 'AL_DIA';
}
