/**
 * Formato de cifras y fechas en es-CO para la interfaz. Los montos llegan de la
 * API como texto decimal; aquí solo se formatean para mostrarlos (no se opera
 * con ellos).
 */

const LOCALE = 'es-CO';

const pesos = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const dosDecimales = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fechaCorta = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC', // las fechas AAAA-MM-DD son de calendario, sin zona
});
const fechaLarga = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});
const fechaHora = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** Precio para mostrar: COP sin decimales; USD y centavos de dólar con 2 decimales. */
export function formatearPrecio(valor: string, moneda: string, unidad: string): string {
  const numero = Number(valor);
  if (unidad === 'USc/lb') {
    return `${dosDecimales.format(numero)} centavos de dólar`;
  }
  if (moneda === 'COP') {
    return pesos.format(numero);
  }
  if (moneda === 'USD') {
    return `US$ ${dosDecimales.format(numero)}`;
  }
  return `${dosDecimales.format(numero)} ${moneda}`;
}

/** Tasa de cambio en pesos con 2 decimales: "3316.700000" -> "$ 3.316,70". */
export function formatearTasa(valor: string): string {
  return `$ ${dosDecimales.format(Number(valor))}`;
}

const UNIDADES: Record<string, string> = {
  kg: 'por kilo',
  'carga 125 kg': 'por carga de 125 kg',
  arroba: 'por arroba',
  lb: 'por libra',
  'USc/lb': 'por libra',
};

/** "carga 125 kg" -> "por carga de 125 kg". */
export function etiquetaUnidad(unidad: string): string {
  return UNIDADES[unidad] ?? `por ${unidad}`;
}

/** Toma una parte de Intl.DateTimeFormat#formatToParts (mes sin punto final). */
function parte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  return (partes.find((p) => p.type === tipo)?.value ?? '').replace(/\.$/, '');
}

/** "2026-11-13" -> "13 nov 2026". */
export function formatearFecha(fecha: string): string {
  const partes = fechaCorta.formatToParts(new Date(`${fecha}T00:00:00Z`));
  return `${parte(partes, 'day')} ${parte(partes, 'month')} ${parte(partes, 'year')}`;
}

const mesLargo = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "2026-10-01" -> "octubre de 2026" (para datos mensuales). */
export function formatearMes(fecha: string): string {
  return mesLargo.format(new Date(`${fecha}T00:00:00Z`));
}

/** "2026-10-01" -> "oct 2026" (ejes y tablas). */
export function formatearMesCorto(fecha: string): string {
  const partes = mesLargo.formatToParts(new Date(`${fecha}T00:00:00Z`));
  const mes = (partes.find((p) => p.type === 'month')?.value ?? '').slice(0, 3);
  return `${mes} ${partes.find((p) => p.type === 'year')?.value ?? ''}`;
}

/** Fecha de un dato según su periodicidad: "13 nov 2026" o "octubre de 2026". */
export function formatearFechaDato(fecha: string, periodicidad: string): string {
  return periodicidad === 'MENSUAL' ? formatearMes(fecha) : formatearFecha(fecha);
}

/** "2026-11-16" -> "lunes, 16 de noviembre". */
export function formatearFechaLarga(fecha: string): string {
  return fechaLarga.format(new Date(`${fecha}T00:00:00Z`));
}

/** Instante ISO -> "16 nov, 7:30 a. m." en hora de Colombia. */
export function formatearFechaHora(iso: string): string {
  const partes = fechaHora.formatToParts(new Date(iso));
  const periodo = partes.find((p) => p.type === 'dayPeriod')?.value ?? '';
  return `${parte(partes, 'day')} ${parte(partes, 'month')}, ${parte(partes, 'hour')}:${parte(partes, 'minute')} ${periodo}`.trim();
}

/** "1.22" -> "1,22 %" (sin signo; el signo lo da la flecha). */
export function formatearPorcentaje(porcentaje: string): string {
  return `${dosDecimales.format(Math.abs(Number(porcentaje)))} %`;
}

export type Tendencia = 'sube' | 'baja' | 'igual';

export function tendencia(absoluta: string): Tendencia {
  const n = Number(absoluta);
  return n > 0 ? 'sube' : n < 0 ? 'baja' : 'igual';
}
