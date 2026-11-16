import { calcularEstadoFuente, type DatosEstadoFuente } from './estado-fuente.js';

const ahora = new Date('2026-11-16T12:00:00Z');
const haceDias = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000);

const base: DatosEstadoFuente = {
  tipo: 'OFICIAL_NACIONAL',
  frecuencia: 'DIARIA',
  ultimaIngestaExitosa: haceDias(1),
  ultimoEstado: 'OK',
};

describe('calcularEstadoFuente', () => {
  it('una fuente manual siempre es NO_APLICA', () => {
    expect(calcularEstadoFuente({ ...base, tipo: 'MANUAL', ultimoEstado: 'ERROR' }, ahora)).toBe(
      'NO_APLICA',
    );
  });

  it('si la última ejecución falló, es ERROR aunque haya datos previos', () => {
    expect(calcularEstadoFuente({ ...base, ultimoEstado: 'ERROR' }, ahora)).toBe('ERROR');
  });

  it('sin ingestas exitosas es SIN_DATOS', () => {
    expect(
      calcularEstadoFuente({ ...base, ultimaIngestaExitosa: null, ultimoEstado: null }, ahora),
    ).toBe('SIN_DATOS');
  });

  it('una fuente diaria con dato de hace 1 día está AL_DIA', () => {
    expect(calcularEstadoFuente(base, ahora)).toBe('AL_DIA');
  });

  it('tolera un fin de semana largo en fuentes diarias', () => {
    expect(calcularEstadoFuente({ ...base, ultimaIngestaExitosa: haceDias(4) }, ahora)).toBe(
      'AL_DIA',
    );
    expect(calcularEstadoFuente({ ...base, ultimaIngestaExitosa: haceDias(5) }, ahora)).toBe(
      'ATRASADA',
    );
  });

  it('usa la tolerancia de la frecuencia', () => {
    const mensual = { ...base, frecuencia: 'MENSUAL' as const };
    expect(calcularEstadoFuente({ ...mensual, ultimaIngestaExitosa: haceDias(40) }, ahora)).toBe(
      'AL_DIA',
    );
    expect(calcularEstadoFuente({ ...mensual, ultimaIngestaExitosa: haceDias(50) }, ahora)).toBe(
      'ATRASADA',
    );
  });
});
