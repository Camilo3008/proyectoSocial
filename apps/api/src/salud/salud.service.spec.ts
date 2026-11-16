import { type DataSource } from 'typeorm';
import { SaludService } from './salud.service.js';

describe('SaludService', () => {
  it('reporta ok cuando la base de datos responde', async () => {
    const dataSource = { query: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const salud = await new SaludService(dataSource as unknown as DataSource).verificar();

    expect(salud.estado).toBe('ok');
    expect(salud.baseDatos.estado).toBe('ok');
    expect(salud.baseDatos.latenciaMs).toBeGreaterThanOrEqual(0);
  });

  it('reporta error cuando la base de datos falla', async () => {
    const dataSource = { query: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) };
    const salud = await new SaludService(dataSource as unknown as DataSource).verificar();

    expect(salud.estado).toBe('error');
    expect(salud.baseDatos).toEqual({ estado: 'error', latenciaMs: null });
  });
});
