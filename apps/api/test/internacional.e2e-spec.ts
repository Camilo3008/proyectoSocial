import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type CommoditiesDto,
  type IngestaEjecucionDto,
  type PreciosHoyDto,
} from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { crearAplicacion, iniciarSesionAdmin, prepararBaseDatosPruebas } from './utilidades.js';

// Fixtures REALES: TRM de datos.gov.co y XLSX del Banco Mundial. Las descargas se simulan.
const FIXTURE_TRM = readFileSync(join(import.meta.dirname, 'fixtures/trm/ultimas-40.json'), 'utf8');
const FIXTURE_WB = new Uint8Array(
  readFileSync(
    join(import.meta.dirname, 'fixtures/worldbank/CMO-Historical-Data-Monthly-2026-11-03.xlsx'),
  ),
);
const CITA_WB = 'Fuente: Banco Mundial, Commodity Price Data (The Pink Sheet), CC BY 4.0';

describe('Internacional: Banco Mundial (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let ds: DataSource;

  const post = (url: string, cuerpo?: object) =>
    request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${token}`).send(cuerpo);
  const get = async <T>(url: string) =>
    (await request(app.getHttpServer()).get(url).expect(200)).body as T;

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
    token = await iniciarSesionAdmin(app);
    ds = app.get(DataSource);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(FIXTURE_TRM)));
    await post('/api/admin/ingesta/trm').expect(200);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(FIXTURE_WB))),
    );
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await app?.close();
  });

  it('ingiere el Pink Sheet completo (desde 1960) de forma idempotente', async () => {
    const primera = (await post('/api/admin/ingesta/worldbank').expect(200))
      .body as IngestaEjecucionDto;
    expect(primera).toMatchObject({ fuente: 'worldbank', estado: 'OK', mercadosNuevos: 0 });
    expect(primera.leidos).toBeGreaterThan(3500);
    expect(primera.insertados).toBe(primera.leidos);

    const segunda = (await post('/api/admin/ingesta/worldbank').expect(200))
      .body as IngestaEjecucionDto;
    expect(segunda).toMatchObject({ estado: 'OK', insertados: 0, actualizados: 0 });
  });

  it('convierte a COP/kg con el promedio de la TRM del mes', async () => {
    const [fila] = await ds.query<{ usd: string; cop: string; trm: string }[]>(
      `SELECT o.valor_usd_kg::text AS usd, o.valor_cop_kg::text AS cop,
              (SELECT round(avg(valor), 6)::text FROM tasa_cambio
                WHERE fecha >= '2026-10-01' AND fecha < '2026-11-01') AS trm
       FROM observacion_precio o JOIN producto p ON p.id = o.producto_id
       WHERE p.slug = 'cacao' AND o.fecha = '2026-10-01'`,
    );
    expect(fila!.usd).toBe('5.7500');
    // 5.75 USD/kg × TRM promedio de octubre de 2026 (calculada de los datos reales del fixture)
    expect(Number(fila!.cop)).toBeCloseTo(5.75 * Number(fila!.trm), 2);
    // Meses sin TRM cargada (p. ej. 1960) quedan sin valor en COP.
    const [antiguo] = await ds.query<{ cop: string | null }[]>(
      `SELECT o.valor_cop_kg::text AS cop FROM observacion_precio o
       JOIN producto p ON p.id = o.producto_id
       WHERE p.slug = 'cafe' AND o.presentacion = 'verde arábica (indicador ICO)'
         AND o.fecha = '1960-01-01'`,
    );
    expect(antiguo!.cop).toBeNull();
  });

  it('GET /api/internacional/commodities devuelve las series del producto con su cita', async () => {
    const r = await get<CommoditiesDto>('/api/internacional/commodities?producto=cafe');
    expect(r).toMatchObject({
      producto: { slug: 'cafe' },
      fuente: { slug: 'worldbank', cita: CITA_WB },
      hasta: '2026-10-01',
      desde: '2024-11-01',
    });
    expect(r.series.map((s) => s.presentacion).sort()).toEqual([
      'verde arábica (indicador ICO)',
      'verde robusta (indicador ICO)',
    ]);
    const arabica = r.series.find((s) => s.presentacion.startsWith('verde arábica'))!;
    expect(arabica.items).toHaveLength(24);
    expect(arabica.items.at(-1)).toMatchObject({ fecha: '2026-10-01', valorUsdKg: '7.4000' });
    // Sin precio FNC cargado, no hay referencia nacional.
    expect(r.nacional).toBeNull();
  });

  it('compara con el promedio mensual del precio nacional (FNC) cuando existe', async () => {
    // DATO DE EJEMPLO: dos precios FNC de octubre de 2026.
    for (const [fecha, valor] of [
      ['2026-10-14', '2000000'],
      ['2026-10-15', '2100000'],
    ]) {
      await post('/api/admin/precios', {
        producto: 'cafe',
        fuente: 'fnc',
        fecha,
        presentacion: 'pergamino seco',
        valor,
        moneda: 'COP',
        unidad: 'carga 125 kg',
        referencia: 'DATO DE EJEMPLO',
      }).expect(201);
    }
    const r = await get<CommoditiesDto>(
      '/api/internacional/commodities?producto=cafe&desde=2026-09-01&hasta=2026-10-01',
    );
    expect(r.nacional).toEqual({
      fuente: { slug: 'fnc', nombre: 'Federación Nacional de Cafeteros', cita: null },
      mercado: null,
      presentacion: 'pergamino seco',
      // (2.000.000 + 2.100.000) / 2 / 125 kg
      items: [{ fecha: '2026-10-01', valorCopKg: '16400.0000' }],
    });
    expect(r.series[0]?.items.map((i) => i.fecha)).toEqual(['2026-09-01', '2026-10-01']);
  });

  it('el cacao no tiene referencia nacional y aparece en "Hoy" con el precio internacional', async () => {
    const r = await get<CommoditiesDto>('/api/internacional/commodities?producto=cacao');
    expect(r.series.map((s) => s.presentacion)).toEqual(['en grano (ICCO)']);
    expect(r.nacional).toBeNull();

    const hoy = await get<PreciosHoyDto>('/api/precios/hoy');
    const cacao = hoy.items.find((i) => i.producto.slug === 'cacao');
    expect(cacao).toMatchObject({
      fuente: { slug: 'worldbank', cita: CITA_WB },
      mercado: null,
      fecha: '2026-10-01',
      periodicidad: 'MENSUAL',
      presentacion: 'en grano (ICCO)',
      valor: '5.7500',
      moneda: 'USD',
      unidad: 'kg',
      // 5.75 frente a 5.92 de septiembre
      variacion: { absoluta: '-0.1700', porcentaje: '-2.87', fechaAnterior: '2026-09-01' },
    });
    expect(cacao?.valorCopKg).not.toBeNull();
    expect(hoy.sinDatos.map((p) => p.slug)).not.toContain('cacao');
  });

  it('valida los parámetros y responde 404 sin datos', async () => {
    await request(app.getHttpServer())
      .get('/api/internacional/commodities?producto=cafe&desde=ayer')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/internacional/commodities?producto=platano')
      .expect(404);
  });
});
