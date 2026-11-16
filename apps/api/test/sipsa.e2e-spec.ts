import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type IngestaEjecucionDto } from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { crearAplicacion, iniciarSesionAdmin, prepararBaseDatosPruebas } from './utilidades.js';

// Recorte REAL de SIPSA: la descarga se simula, las pruebas no usan la red.
const FIXTURE = readFileSync(
  join(import.meta.dirname, 'fixtures/sipsa/promedios-parcial-recorte.xml'),
  'utf8',
);

function respuesta(texto: string): Response {
  const bytes = new TextEncoder().encode(texto);
  return new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < bytes.length; i += 1024) c.enqueue(bytes.slice(i, i + 1024));
        c.close();
      },
    }),
  );
}

describe('Ingesta SIPSA (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let ds: DataSource;
  let xml = FIXTURE;

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
    token = await iniciarSesionAdmin(app);
    ds = app.get(DataSource);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(respuesta(xml))),
    );
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await app?.close();
  });

  const ejecutar = async (desde = '2026-11-01') =>
    (
      await request(app.getHttpServer())
        .post(`/api/admin/ingesta/sipsa?desde=${desde}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
    ).body as IngestaEjecucionDto;

  const mercadosSipsa = () =>
    ds.query<
      {
        codigo_externo: string;
        nombre: string;
        municipio: string;
        departamento: string;
        lat: string | null;
        tipo: string;
      }[]
    >(
      `SELECT m.codigo_externo, m.nombre, m.municipio, m.departamento, m.lat, m.tipo
       FROM mercado m JOIN fuente f ON f.id = m.fuente_id WHERE f.slug = 'sipsa'
       ORDER BY m.codigo_externo::int`,
    );

  it('crea los mercados por código de la fuente y guarda las observaciones mapeadas', async () => {
    const ejecucion = await ejecutar();

    expect(ejecucion).toMatchObject({
      fuente: 'sipsa',
      estado: 'OK',
      leidos: 24,
      insertados: 24,
      actualizados: 0,
      mercadosNuevos: 2,
    });

    expect(await mercadosSipsa()).toEqual([
      {
        codigo_externo: '1',
        nombre: 'Bogotá, D.C., Corabastos',
        municipio: 'BOGOTÁ, D.C.',
        departamento: 'BOGOTÁ, D.C.',
        lat: null,
        tipo: 'MAYORISTA',
      },
      {
        codigo_externo: '22',
        nombre: 'Neiva, Surabastos',
        municipio: 'NEIVA',
        departamento: 'HUILA',
        lat: null,
        tipo: 'MAYORISTA',
      },
    ]);

    const [neiva] = await ds.query<
      {
        producto: string;
        presentacion: string;
        valor: string;
        unidad: string;
        valor_cop_kg: string;
      }[]
    >(
      `SELECT p.slug AS producto, o.presentacion, o.valor::text, o.unidad, o.valor_cop_kg::text
       FROM observacion_precio o JOIN producto p ON p.id = o.producto_id
       JOIN mercado m ON m.id = o.mercado_id
       WHERE m.nombre = 'Neiva, Surabastos' AND o.fecha = '2026-11-13' AND p.slug = 'platano'
         AND o.presentacion = 'hartón verde'`,
    );
    expect(neiva).toEqual({
      producto: 'platano',
      presentacion: 'hartón verde',
      valor: '2133.0000',
      unidad: 'kg',
      valor_cop_kg: '2133.0000',
    });
  });

  it('es idempotente: reejecutar no duplica mercados ni observaciones', async () => {
    const ejecucion = await ejecutar();
    expect(ejecucion).toMatchObject({
      estado: 'OK',
      leidos: 24,
      insertados: 0,
      actualizados: 0,
      mercadosNuevos: 0,
    });
    expect(await mercadosSipsa()).toHaveLength(2);
  });

  it('si la fuente renombra un mercado, actualiza el nombre sin duplicarlo', async () => {
    xml = FIXTURE.replaceAll('Neiva, Surabastos', 'Neiva, Surabastos (nuevo nombre)');
    const ejecucion = await ejecutar();
    xml = FIXTURE;

    expect(ejecucion.mercadosNuevos).toBe(0);
    const mercados = await mercadosSipsa();
    expect(mercados).toHaveLength(2);
    expect(mercados.find((m) => m.codigo_externo === '22')?.nombre).toBe(
      'Neiva, Surabastos (nuevo nombre)',
    );
    await ejecutar(); // restaura el nombre original
  });

  it('respeta la ventana de fechas', async () => {
    const [{ total }] = await ds.query<{ total: number }[]>(
      "SELECT count(*)::int AS total FROM observacion_precio WHERE fecha < '2026-11-01'",
    );
    expect(total).toBe(0);
    const soloUltimo = await ejecutar('2026-11-13');
    expect(soloUltimo.leidos).toBeLessThan(24);
  });

  it('registra los mercados nuevos en la bitácora', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/ingestas?fuente=sipsa')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const bitacora = res.body as IngestaEjecucionDto[];
    expect(bitacora.at(-1)?.mercadosNuevos).toBe(2);
    expect(bitacora.slice(0, -1).every((e) => e.mercadosNuevos === 0)).toBe(true);
  });

  it('valida el parámetro desde', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/ingesta/sipsa?desde=ayer')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
