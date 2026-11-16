import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type FuenteDto, type IngestaEjecucionDto, type SerieTrmDto } from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { crearAplicacion, iniciarSesionAdmin, prepararBaseDatosPruebas } from './utilidades.js';

// Fixture REAL de datos.gov.co: la descarga se simula, las pruebas no usan la red.
const FIXTURE_TRM = readFileSync(join(import.meta.dirname, 'fixtures/trm/ultimas-40.json'), 'utf8');

describe('Ingesta TRM (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  const fetchFalso = vi.fn<typeof fetch>();

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
    token = await iniciarSesionAdmin(app);
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await app?.close();
  });

  const ejecutarTrm = () =>
    request(app.getHttpServer())
      .post('/api/admin/ingesta/trm')
      .set('Authorization', `Bearer ${token}`);

  it('exige token de administrador', async () => {
    await request(app.getHttpServer()).post('/api/admin/ingesta/trm').expect(401);
    await request(app.getHttpServer())
      .post('/api/admin/ingesta/trm')
      .set('Authorization', 'Bearer token-falso')
      .expect(401);
    await request(app.getHttpServer()).get('/api/admin/ingestas').expect(401);
  });

  it('ingesta la TRM, la expande por día y la registra en la bitácora', async () => {
    fetchFalso.mockResolvedValueOnce(new Response(FIXTURE_TRM, { status: 200 }));

    const res = await ejecutarTrm().expect(200);
    const ejecucion = res.body as IngestaEjecucionDto;

    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(ejecucion).toMatchObject({
      fuente: 'trm',
      disparo: 'MANUAL',
      estado: 'OK',
      leidos: 62,
      insertados: 62,
      actualizados: 0,
      error: null,
    });
    expect(ejecucion.payloadHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('expone la serie con su fuente y licencia', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/tasas/trm?desde=2026-11-13&hasta=2026-11-17')
      .expect(200);
    const serie = res.body as SerieTrmDto;

    expect(serie.fuente).toMatchObject({
      slug: 'trm',
      licencia: expect.stringContaining('CC BY-SA') as string,
    });
    expect(serie.items.map((t) => [t.fecha, Number(t.valor)])).toEqual([
      ['2026-11-13', 3301.91],
      ['2026-11-14', 3316.7],
      ['2026-11-15', 3316.7],
      ['2026-11-16', 3316.7],
      ['2026-11-17', 3316.7],
    ]);
  });

  it('es idempotente: reejecutar con los mismos datos no inserta ni actualiza', async () => {
    fetchFalso.mockResolvedValueOnce(new Response(FIXTURE_TRM, { status: 200 }));
    const res = await ejecutarTrm().expect(200);
    expect(res.body).toMatchObject({ estado: 'OK', leidos: 62, insertados: 0, actualizados: 0 });
  });

  it('registra el ERROR sin perder los datos anteriores', async () => {
    fetchFalso.mockResolvedValueOnce(new Response('Servicio no disponible', { status: 503 }));
    const res = await ejecutarTrm().expect(200);
    expect(res.body).toMatchObject({ estado: 'ERROR', insertados: 0 });
    expect((res.body as IngestaEjecucionDto).error).toMatch(/HTTP 503/);

    const serie = await request(app.getHttpServer())
      .get('/api/tasas/trm?desde=2026-11-13&hasta=2026-11-17')
      .expect(200);
    expect((serie.body as SerieTrmDto).items).toHaveLength(5);

    const fuentes = await request(app.getHttpServer()).get('/api/fuentes').expect(200);
    const trm = (fuentes.body as FuenteDto[]).find((f) => f.slug === 'trm');
    expect(trm?.estado).toBe('ERROR');
    expect(trm?.ultimaIngestaExitosa).not.toBeNull();
  });

  it('muestra la bitácora más reciente primero y filtra por estado', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/ingestas?fuente=trm')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((res.body as IngestaEjecucionDto[]).map((e) => e.estado)).toEqual(['ERROR', 'OK', 'OK']);

    const errores = await request(app.getHttpServer())
      .get('/api/admin/ingestas?estado=ERROR')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(errores.body).toHaveLength(1);
  });

  it('responde 404 para fuentes sin adapter (la FNC es de carga manual)', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/ingesta/fnc')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('valida los parámetros de consulta de la TRM', async () => {
    await request(app.getHttpServer()).get('/api/tasas/trm?desde=16-11-2026').expect(400);
    await request(app.getHttpServer())
      .get('/api/tasas/trm?desde=2026-11-17&hasta=2026-11-01')
      .expect(400);
  });
});
