import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type DetallePaisDto,
  type IngestaEjecucionDto,
  type MapaPaisesDto,
} from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { crearAplicacion, iniciarSesionAdmin, prepararBaseDatosPruebas } from './utilidades.js';

// Fixture REAL (recorte) de FAOSTAT Producer Prices. La descarga se simula.
const ZIP = new Uint8Array(
  readFileSync(join(import.meta.dirname, 'fixtures/faostat/producer-prices-recorte.zip')),
);

describe('Globo: FAOSTAT por país (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const get = async <T>(url: string) =>
    (await request(app.getHttpServer()).get(url).expect(200)).body as T;

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
    token = await iniciarSesionAdmin(app);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(ZIP))),
    );
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await app?.close();
  });

  it('el seed completa región y coordenadas de los países con Natural Earth', async () => {
    const [col] = await app
      .get(DataSource)
      .query<{ region: string; lat: string; lng: string }[]>(
        "SELECT region, lat::text, lng::text FROM pais WHERE iso3 = 'COL'",
      );
    expect(col).toEqual({ region: 'Americas', lat: '3.373111', lng: '-73.174347' });
  });

  it('ingiere los precios al productor por país de forma idempotente', async () => {
    const ingerir = async () =>
      (
        await request(app.getHttpServer())
          .post('/api/admin/ingesta/faostat')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body as IngestaEjecucionDto;

    const primera = await ingerir();
    expect(primera).toMatchObject({ fuente: 'faostat', estado: 'OK', mercadosNuevos: 0 });
    expect(primera.insertados).toBe(primera.leidos);
    expect(primera.leidos).toBeGreaterThan(30);

    expect(await ingerir()).toMatchObject({ estado: 'OK', insertados: 0, actualizados: 0 });
  });

  it('GET /api/internacional/paises devuelve el último año, ordenado, con la cita de la FAO', async () => {
    const mapa = await get<MapaPaisesDto>('/api/internacional/paises?producto=cafe');
    expect(mapa).toMatchObject({
      producto: { slug: 'cafe' },
      fuente: { slug: 'faostat' },
      presentacion: 'verde, precio al productor',
      anio: 2024,
    });
    expect(mapa.fuente.cita).toMatch(/^FAO\. 2026\. FAOSTAT.*Licencia: CC-BY-4\.0$/);
    expect(mapa.aniosDisponibles.slice(0, 3)).toEqual([2024, 2023, 2022]);

    const colombia = mapa.items.find((i) => i.iso3 === 'COL');
    expect(colombia).toMatchObject({
      iso2: 'CO',
      nombre: 'Colombia',
      valorUsdT: '3719.1000',
      valorUsdKg: '3.7191',
      bandera: 'A',
    });
    const valores = mapa.items.map((i) => Number(i.valorUsdKg));
    expect([...valores].sort((a, b) => b - a)).toEqual(valores);
  });

  it('permite elegir el año y responde vacío si no hay datos', async () => {
    const mapa2022 = await get<MapaPaisesDto>('/api/internacional/paises?producto=cacao&anio=2022');
    expect(mapa2022.anio).toBe(2022);
    expect(mapa2022.items.length).toBeGreaterThan(0);

    const vacio = await get<MapaPaisesDto>('/api/internacional/paises?producto=cafe&anio=1950');
    expect(vacio).toMatchObject({ anio: null, items: [] });
  });

  it('GET /api/internacional/paises/:iso3 trae la serie y la comparación con Colombia', async () => {
    const brasil = await get<DetallePaisDto>('/api/internacional/paises/BRA?producto=cafe');
    expect(brasil.pais).toMatchObject({ iso3: 'BRA', iso2: 'BR', region: 'Americas' });
    expect(brasil.serie.map((s) => s.anio)).toEqual([2022, 2023, 2024]);
    expect(brasil.ultimo?.anio).toBe(2024);
    expect(brasil.comparacionColombia).toMatchObject({ anio: 2024, valorColombiaUsdKg: '3.7191' });
    expect(brasil.comparacionColombia?.diferenciaPct).toMatch(/^-?\d+\.\d{2}$/);

    const colombia = await get<DetallePaisDto>('/api/internacional/paises/COL?producto=cafe');
    expect(colombia.comparacionColombia).toBeNull();
  });

  it('valida los parámetros', async () => {
    await request(app.getHttpServer())
      .get('/api/internacional/paises/col?producto=cafe')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/internacional/paises/XXX?producto=cafe')
      .expect(404);
    await request(app.getHttpServer())
      .get('/api/internacional/paises?producto=cafe&anio=hoy')
      .expect(400);
  });
});
