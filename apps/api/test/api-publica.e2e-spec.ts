import { type FuenteDto, type ProductoDto, type SaludDto } from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { crearAplicacion, prepararBaseDatosPruebas } from './utilidades.js';

describe('API pública (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /api/salud', () => {
    it('responde ok con la base de datos disponible y sin caché', async () => {
      const res = await request(app.getHttpServer()).get('/api/salud').expect(200);
      const cuerpo = res.body as SaludDto;

      expect(cuerpo.estado).toBe('ok');
      expect(cuerpo.baseDatos.estado).toBe('ok');
      expect(res.headers['cache-control']).toBe('no-store');
      // Estado de cada fuente: con la base recién sembrada, ninguna está al día.
      expect(cuerpo.fuentes.map((f) => f.slug)).toEqual(
        expect.arrayContaining(['trm', 'sipsa', 'worldbank', 'faostat', 'fnc']),
      );
      expect(cuerpo.fuentes.find((f) => f.slug === 'trm')).toMatchObject({
        estado: 'SIN_DATOS',
        ultimaIngestaExitosa: null,
      });
    });

    it('incluye encabezados de seguridad de helmet', async () => {
      const res = await request(app.getHttpServer()).get('/api/salud');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('GET /api/productos', () => {
    it('lista los productos del catálogo', async () => {
      const res = await request(app.getHttpServer()).get('/api/productos').expect(200);
      const productos = res.body as ProductoDto[];

      expect(productos.map((p) => p.slug)).toEqual([
        'cafe',
        'platano',
        'banano',
        'cacao',
        'pitaya',
      ]);
      expect(productos[0]).toEqual({
        slug: 'cafe',
        nombre: 'Café',
        descripcion: expect.any(String) as string,
        unidadBase: 'kg',
      });
    });

    it('envía Cache-Control y ETag, y responde 304 si no cambió', async () => {
      const primera = await request(app.getHttpServer()).get('/api/productos').expect(200);
      expect(primera.headers['cache-control']).toContain('max-age=');
      const etag = primera.headers['etag'] as string;
      expect(etag).toBeTruthy();

      await request(app.getHttpServer())
        .get('/api/productos')
        .set('If-None-Match', etag)
        .expect(304);
    });
  });

  describe('GET /api/fuentes', () => {
    it('lista las fuentes con su estado inicial', async () => {
      const res = await request(app.getHttpServer()).get('/api/fuentes').expect(200);
      const fuentes = res.body as FuenteDto[];

      expect(fuentes.map((f) => f.slug)).toEqual([
        'fnc',
        'sipsa',
        'worldbank',
        'faostat',
        'trm',
        'manual',
      ]);
      const porSlug = Object.fromEntries(fuentes.map((f) => [f.slug, f]));
      expect(porSlug['fnc']).toMatchObject({ estado: 'SIN_DATOS', ultimaIngestaExitosa: null });
      expect(porSlug['manual']?.estado).toBe('NO_APLICA');
    });

    it('refleja la última ingesta en el estado de cada fuente', async () => {
      const ds = app.get(DataSource);
      await ds.query(`
        INSERT INTO ingesta_ejecucion (fuente_id, disparo, inicio, fin, estado)
        SELECT f.id, v.disparo::disparo_ingesta, now() - v.hace, now() - v.hace + interval '1 minute',
               v.estado::estado_ingesta
        FROM (VALUES
          ('trm',   'MANUAL',     interval '1 hour',  'OK'),
          ('fnc',   'PROGRAMADO', interval '20 days', 'OK'),
          ('sipsa', 'PROGRAMADO', interval '2 days',  'OK'),
          ('sipsa', 'PROGRAMADO', interval '1 day',   'ERROR')
        ) AS v(slug, disparo, hace, estado)
        JOIN fuente f ON f.slug = v.slug
      `);

      const res = await request(app.getHttpServer()).get('/api/fuentes').expect(200);
      const porSlug = Object.fromEntries((res.body as FuenteDto[]).map((f) => [f.slug, f]));

      expect(porSlug['trm']?.estado).toBe('AL_DIA');
      expect(porSlug['trm']?.ultimaIngestaExitosa).not.toBeNull();
      expect(porSlug['fnc']?.estado).toBe('ATRASADA');
      expect(porSlug['sipsa']?.estado).toBe('ERROR');
    });
  });

  it('responde 404 en rutas desconocidas', async () => {
    await request(app.getHttpServer()).get('/api/no-existe').expect(404);
  });

  it('publica la documentación OpenAPI', async () => {
    const res = await request(app.getHttpServer()).get('/api/docs-json').expect(200);
    const paths = Object.keys((res.body as { paths: Record<string, unknown> }).paths);
    expect(paths).toEqual(expect.arrayContaining(['/api/salud', '/api/productos', '/api/fuentes']));
  });
});
