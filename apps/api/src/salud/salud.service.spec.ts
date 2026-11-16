import { type FuenteDto } from '@agroprecios/shared';
import { type DataSource } from 'typeorm';
import { type CatalogoService } from '../catalogo/catalogo.service.js';
import { SaludService } from './salud.service.js';

const FUENTE_TRM: FuenteDto = {
  slug: 'trm',
  nombre: 'TRM',
  descripcion: null,
  tipo: 'OFICIAL_NACIONAL',
  url: null,
  licencia: 'CC BY-SA 4.0',
  frecuencia: 'DIARIA',
  ultimaIngestaExitosa: '2026-11-16T12:00:00.000Z',
  estado: 'AL_DIA',
};

const crear = (query: () => Promise<unknown>, listarFuentes: () => Promise<FuenteDto[]>) =>
  new SaludService(
    { query: vi.fn(query) } as unknown as DataSource,
    { listarFuentes: vi.fn(listarFuentes) } as unknown as CatalogoService,
  );

describe('SaludService', () => {
  it('reporta ok y el estado de cada fuente cuando la base de datos responde', async () => {
    const salud = await crear(
      () => Promise.resolve([{ '?column?': 1 }]),
      () => Promise.resolve([FUENTE_TRM]),
    ).verificar();

    expect(salud.estado).toBe('ok');
    expect(salud.baseDatos.estado).toBe('ok');
    expect(salud.baseDatos.latenciaMs).toBeGreaterThanOrEqual(0);
    expect(salud.fuentes).toEqual([
      { slug: 'trm', estado: 'AL_DIA', ultimaIngestaExitosa: '2026-11-16T12:00:00.000Z' },
    ]);
  });

  it('reporta error cuando la base de datos falla, sin consultar las fuentes', async () => {
    const listar = vi.fn(() => Promise.resolve([FUENTE_TRM]));
    const salud = await crear(() => Promise.reject(new Error('ECONNREFUSED')), listar).verificar();

    expect(salud.estado).toBe('error');
    expect(salud.baseDatos).toEqual({ estado: 'error', latenciaMs: null });
    expect(salud.fuentes).toEqual([]);
  });

  it('si falla el cálculo de las fuentes, la API sigue sana', async () => {
    const salud = await crear(
      () => Promise.resolve([]),
      () => Promise.reject(new Error('timeout')),
    ).verificar();
    expect(salud.estado).toBe('ok');
    expect(salud.fuentes).toEqual([]);
  });
});
