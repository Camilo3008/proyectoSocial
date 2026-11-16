import { calcularVariacion, decimal, dividir, esDecimal } from './decimal.js';
import { calcularDerivados, valorPorKg } from './unidades.js';

// DATO DE EJEMPLO: valores con la forma de los reales, solo para pruebas.

describe('decimal', () => {
  it('valida el formato decimal con punto', () => {
    expect(esDecimal('2075000')).toBe(true);
    expect(esDecimal('278.65')).toBe(true);
    expect(esDecimal('-1.5')).toBe(true);
    expect(esDecimal('2.075.000')).toBe(false);
    expect(esDecimal('3316,7')).toBe(false);
    expect(esDecimal('')).toBe(false);
    expect(() => decimal('abc')).toThrow(/inválido/);
  });

  it('divide sin errores de punto flotante', () => {
    // 0.1 + 0.2 con number da 0.30000000000000004
    expect(dividir(decimal('0.3'), decimal('3'), 4)).toBe('0.1000');
    expect(() => dividir(decimal('1'), decimal('0'))).toThrow(/cero/);
  });

  it('calcula la variación absoluta y porcentual', () => {
    expect(calcularVariacion('2075000', '2050000')).toEqual({
      absoluta: '25000.0000',
      porcentaje: '1.22',
    });
    expect(calcularVariacion('2000000', '2050000')).toEqual({
      absoluta: '-50000.0000',
      porcentaje: '-2.44',
    });
    expect(calcularVariacion('5', '0').porcentaje).toBeNull();
  });
});

describe('unidades', () => {
  it('convierte una carga de 125 kg a COP/kg', () => {
    expect(valorPorKg('2075000', 'carga 125 kg')?.toFixed(4)).toBe('16600.0000');
  });

  it('convierte centavos de dólar por libra a USD/kg', () => {
    // 278.65 USc/lb = 2.7865 USD / 0.45359237 kg
    expect(valorPorKg('278.65', 'USc/lb')?.toFixed(4)).toBe('6.1432');
  });

  it('devuelve null para unidades desconocidas', () => {
    expect(valorPorKg('10', 'bulto')).toBeNull();
    expect(calcularDerivados('10', 'COP', 'bulto', '4000')).toEqual({
      valorCopKg: null,
      valorUsdKg: null,
    });
  });

  it('deriva COP/kg y USD/kg de un precio en COP', () => {
    expect(calcularDerivados('2075000', 'COP', 'carga 125 kg', '3316.70')).toEqual({
      valorCopKg: '16600.0000',
      valorUsdKg: '5.0050',
    });
  });

  it('deriva solo COP/kg si no hay TRM', () => {
    expect(calcularDerivados('2075000', 'COP', 'carga 125 kg', null)).toEqual({
      valorCopKg: '16600.0000',
      valorUsdKg: null,
    });
  });

  it('deriva COP/kg de un precio en USD con la TRM', () => {
    expect(calcularDerivados('278.65', 'USD', 'USc/lb', '3316.70')).toEqual({
      valorCopKg: '20375.0882',
      valorUsdKg: '6.1432',
    });
  });
});
