import {
  etiquetaUnidad,
  formatearFecha,
  formatearFechaDato,
  formatearFechaHora,
  formatearMes,
  formatearNumero,
  formatearMesCorto,
  formatearPorcentaje,
  formatearPrecio,
  tendencia,
} from './formato';

// Intl usa espacios no separables; se normalizan para comparar.
const n = (texto: string) => texto.replace(/\s/g, ' ');

describe('formato es-CO', () => {
  it('formatea pesos sin decimales y con punto de miles', () => {
    expect(n(formatearPrecio('2075000.0000', 'COP', 'carga 125 kg'))).toBe('$ 2.075.000');
    expect(n(formatearPrecio('16600.5', 'COP', 'kg'))).toBe('$ 16.601');
  });

  it('formatea centavos de dólar y dólares con coma decimal', () => {
    expect(formatearPrecio('278.6500', 'USD', 'USc/lb')).toBe('278,65 centavos de dólar');
    expect(n(formatearPrecio('6.1432', 'USD', 'kg'))).toBe('US$ 6,14');
  });

  it('traduce la unidad a lenguaje cotidiano', () => {
    expect(etiquetaUnidad('carga 125 kg')).toBe('por carga de 125 kg');
    expect(etiquetaUnidad('kg')).toBe('por kilo');
    expect(etiquetaUnidad('bulto')).toBe('por bulto');
  });

  it('formatea fechas de calendario sin correrse de día', () => {
    expect(formatearFecha('2026-11-13')).toMatch(/^13 nov 2026$/);
    expect(formatearFecha('2026-01-01')).toMatch(/^1 ene 2026$/);
  });

  it('formatea meses para datos mensuales', () => {
    expect(formatearMes('2026-10-01')).toBe('octubre de 2026');
    expect(formatearMesCorto('2026-10-01')).toBe('oct 2026');
    expect(formatearFechaDato('2026-10-01', 'MENSUAL')).toBe('octubre de 2026');
    expect(formatearFechaDato('2026-11-13', 'DIARIA')).toMatch(/^13 nov 2026$/);
  });

  it('muestra la hora en zona de Colombia', () => {
    // 12:30 UTC = 7:30 a. m. en Bogotá
    expect(n(formatearFechaHora('2026-11-16T12:30:00.000Z'))).toMatch(/^16 nov, 7:30/);
  });

  it('formatea porcentajes y tendencias', () => {
    expect(n(formatearPorcentaje('1.22'))).toBe('1,22 %');
    expect(n(formatearPorcentaje('-2.44'))).toBe('2,44 %');
    expect(tendencia('25000.0000')).toBe('sube');
    expect(tendencia('-1')).toBe('baja');
    expect(tendencia('0.0000')).toBe('igual');
    expect(formatearNumero('20428.5000')).toBe('20.428,5');
  });
});
