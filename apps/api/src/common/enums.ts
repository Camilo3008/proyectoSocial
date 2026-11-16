// Valores en tiempo de ejecución de los tipos enumerados compartidos.
// `satisfies` garantiza que coincidan con los tipos de @agroprecios/shared.
import {
  type DisparoIngesta,
  type EstadoIngesta,
  type Frecuencia,
  type FrecuenciaFuente,
  type TipoFuente,
  type TipoMercado,
} from '@agroprecios/shared';

export const TIPOS_FUENTE = [
  'OFICIAL_NACIONAL',
  'INTERNACIONAL',
  'MANUAL',
] as const satisfies readonly TipoFuente[];

export const FRECUENCIAS = [
  'DIARIA',
  'SEMANAL',
  'MENSUAL',
  'ANUAL',
] as const satisfies readonly Frecuencia[];

export const FRECUENCIAS_FUENTE = [
  ...FRECUENCIAS,
  'A_DEMANDA',
] as const satisfies readonly FrecuenciaFuente[];

export const TIPOS_MERCADO = [
  'MAYORISTA',
  'BOLSA',
  'REFERENCIA',
  'LOCAL',
] as const satisfies readonly TipoMercado[];

export const DISPAROS_INGESTA = [
  'PROGRAMADO',
  'MANUAL',
] as const satisfies readonly DisparoIngesta[];

export const ESTADOS_INGESTA = [
  'EN_CURSO',
  'OK',
  'PARCIAL',
  'ERROR',
] as const satisfies readonly EstadoIngesta[];
