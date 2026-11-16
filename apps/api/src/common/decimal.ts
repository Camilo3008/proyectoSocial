import Big from 'big.js';

/**
 * Aritmética decimal para montos (CLAUDE.md: nunca `number` para dinero).
 * Los montos viajan como texto decimal ("3316.7", "2075000.0000") y solo se
 * operan con Big.
 */

const PATRON_DECIMAL = /^-?\d+(\.\d+)?$/;

/** true si el texto es un decimal válido con punto como separador ("2075000", "278.65"). */
export function esDecimal(texto: string): boolean {
  return PATRON_DECIMAL.test(texto);
}

/** Convierte texto a Big validando el formato. */
export function decimal(texto: string): Big {
  if (!esDecimal(texto)) {
    throw new Error(`Valor decimal inválido: "${texto}"`);
  }
  return new Big(texto);
}

/** Redondea (mitad hacia arriba) y devuelve texto con `escala` decimales fijos. */
export function aTexto(valor: Big, escala = 4): string {
  return valor.round(escala, Big.roundHalfUp).toFixed(escala);
}

/** a / b con `escala` decimales. Lanza si b es cero. */
export function dividir(a: Big, b: Big, escala = 4): string {
  if (b.eq(0)) {
    throw new Error('División por cero');
  }
  return aTexto(a.div(b), escala);
}

export interface Variacion {
  /** actual - anterior, 4 decimales. */
  absoluta: string;
  /** (actual - anterior) / anterior * 100, 2 decimales. null si anterior es 0. */
  porcentaje: string | null;
}

/** Variación entre dos valores decimales en texto. */
export function calcularVariacion(actual: string, anterior: string): Variacion {
  const a = decimal(actual);
  const b = decimal(anterior);
  const diferencia = a.minus(b);
  return {
    absoluta: aTexto(diferencia, 4),
    porcentaje: b.eq(0) ? null : dividir(diferencia.times(100), b, 2),
  };
}
