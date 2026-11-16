/**
 * Utilidades de fechas de negocio (YYYY-MM-DD). La zona de negocio es
 * America/Bogota (UTC-5, sin horario de verano).
 */

export const ZONA_NEGOCIO = 'America/Bogota';

const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Fecha de hoy (o de `instante`) en Bogotá, como YYYY-MM-DD. */
export function fechaBogota(instante: Date = new Date()): string {
  return formatoFecha.format(instante);
}

/** Suma días a una fecha YYYY-MM-DD (aritmética de calendario, sin zona horaria). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** true si el texto es una fecha de calendario válida YYYY-MM-DD. */
export function esFechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return false;
  }
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}
