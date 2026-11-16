import type Big from 'big.js';
import { aTexto, decimal, dividir } from './decimal.js';

/**
 * Unidades de precio conocidas y su equivalencia a "moneda por kg".
 * - kgPorUnidad: cuántos kg hay en la unidad.
 * - factorMoneda: multiplica el valor para llevarlo a la moneda principal
 *   (p. ej. centavos de dólar -> dólares = 0.01).
 *
 * Solo se convierten UNIDADES de una misma presentación; nunca presentaciones
 * distintas (pergamino seco ≠ excelso ≠ verde).
 */
export const UNIDADES = {
  kg: { kgPorUnidad: '1', factorMoneda: '1', descripcion: 'kilogramo' },
  'carga 125 kg': { kgPorUnidad: '125', factorMoneda: '1', descripcion: 'carga de 125 kg' },
  arroba: { kgPorUnidad: '12.5', factorMoneda: '1', descripcion: 'arroba (12,5 kg)' },
  lb: { kgPorUnidad: '0.45359237', factorMoneda: '1', descripcion: 'libra' },
  'USc/lb': {
    kgPorUnidad: '0.45359237',
    factorMoneda: '0.01',
    descripcion: 'centavos de dólar por libra',
  },
} as const satisfies Record<
  string,
  { kgPorUnidad: string; factorMoneda: string; descripcion: string }
>;

export type UnidadConocida = keyof typeof UNIDADES;

export function esUnidadConocida(unidad: string): unidad is UnidadConocida {
  return Object.hasOwn(UNIDADES, unidad);
}

/** Valor en moneda principal por kg (Big), o null si la unidad no es conocida. */
export function valorPorKg(valor: string, unidad: string): Big | null {
  if (!esUnidadConocida(unidad)) {
    return null;
  }
  const { kgPorUnidad, factorMoneda } = UNIDADES[unidad];
  return decimal(valor).times(factorMoneda).div(kgPorUnidad);
}

export interface ValoresDerivados {
  valorCopKg: string | null;
  valorUsdKg: string | null;
}

/**
 * Calcula los campos derivados COP/kg y USD/kg de una observación.
 * @param trm COP por 1 USD vigente en la fecha del dato, o null si no se conoce.
 */
export function calcularDerivados(
  valor: string,
  moneda: string,
  unidad: string,
  trm: string | null,
): ValoresDerivados {
  const porKg = valorPorKg(valor, unidad);
  if (!porKg) {
    return { valorCopKg: null, valorUsdKg: null };
  }
  if (moneda === 'COP') {
    return {
      valorCopKg: aTexto(porKg),
      valorUsdKg: trm ? dividir(porKg, decimal(trm)) : null,
    };
  }
  if (moneda === 'USD') {
    return {
      valorCopKg: trm ? aTexto(porKg.times(trm)) : null,
      valorUsdKg: aTexto(porKg),
    };
  }
  return { valorCopKg: null, valorUsdKg: null };
}
