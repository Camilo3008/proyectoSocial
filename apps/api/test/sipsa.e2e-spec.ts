import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ComparativoDto,
  type IngestaEjecucionDto,
  type MercadoDto,
  type PreciosHoyDto,
  type SerieDisponibleDto,
  type SeriePrecioDto,
} from '@agroprecios/shared';
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

  // ---- Consultas sobre los datos ingeridos (valores del recorte real) ----

  const CITA_DANE = 'Fuente: Departamento Administrativo Nacional de Estadística: www.dane.gov.co';
  const get = async <T>(url: string) =>
    (await request(app.getHttpServer()).get(url).expect(200)).body as T;

  it('GET /api/mercados lista los mercados creados con su fuente', async () => {
    const mercados = await get<MercadoDto[]>('/api/mercados?tipo=MAYORISTA');
    expect(mercados.map((m) => m.nombre)).toEqual([
      'Bogotá, D.C., Corabastos',
      'Neiva, Surabastos',
    ]);
    expect(mercados[1]).toMatchObject({
      municipio: 'NEIVA',
      departamento: 'HUILA',
      fuente: 'sipsa',
    });
    await request(app.getHttpServer()).get('/api/mercados?tipo=OTRO').expect(400);
  });

  it('"Hoy" muestra plátano y banano de Neiva (el más cercano a Pitalito) con la cita del DANE', async () => {
    const hoy = await get<PreciosHoyDto>('/api/precios/hoy');
    const platano = hoy.items.find((i) => i.producto.slug === 'platano');
    const banano = hoy.items.find((i) => i.producto.slug === 'banano');

    expect(platano).toMatchObject({
      fuente: { slug: 'sipsa', cita: CITA_DANE },
      mercado: { nombre: 'Neiva, Surabastos' },
      presentacion: 'hartón verde',
      fecha: '2026-11-13',
      valor: '2133.0000',
      unidad: 'kg',
      // 2133 frente a 1933 del 12-nov en Neiva
      variacion: { absoluta: '200.0000', porcentaje: '10.35', fechaAnterior: '2026-11-12' },
    });
    expect(platano?.complementos).toEqual([
      expect.objectContaining({
        etiqueta: 'Plátano guineo',
        mercado: expect.objectContaining({ nombre: 'Neiva, Surabastos' }) as object,
        valor: '1500.0000',
        variacion: { absoluta: '0.0000', porcentaje: '0.00', fechaAnterior: '2026-11-12' },
      }),
    ]);
    expect(banano).toMatchObject({
      mercado: { nombre: 'Neiva, Surabastos' },
      valor: '2200.0000',
      variacion: { porcentaje: '13.81' },
    });
    expect(hoy.sinDatos.map((p) => p.slug)).toEqual(['cafe', 'cacao', 'pitaya']);
  });

  it('GET /api/precios/series lista las series comparables del producto', async () => {
    const series = await get<SerieDisponibleDto[]>('/api/precios/series?producto=platano');
    const claves = series.map((s) => `${s.mercado?.nombre} · ${s.presentacion}`).sort();
    expect(claves).toEqual([
      'Bogotá, D.C., Corabastos · guineo',
      'Bogotá, D.C., Corabastos · hartón verde',
      'Neiva, Surabastos · guineo',
      'Neiva, Surabastos · hartón verde',
    ]);
    expect(series[0]?.fuente.cita).toBe(CITA_DANE);
    // La predeterminada es la que usa "Hoy": Neiva, hartón verde.
    const predeterminadas = series.filter((s) => s.predeterminada);
    expect(predeterminadas).toHaveLength(1);
    expect(predeterminadas[0]).toMatchObject({
      mercado: { nombre: 'Neiva, Surabastos' },
      presentacion: 'hartón verde',
    });
  });

  it('GET /api/precios/serie usa la referencia de "Hoy" y resume el rango', async () => {
    const serie = await get<SeriePrecioDto>('/api/precios/serie?producto=platano');
    expect(serie).toMatchObject({
      mercado: { nombre: 'Neiva, Surabastos' },
      presentacion: 'hartón verde',
      unidad: 'kg',
      moneda: 'COP',
      hasta: '2026-11-13',
      desde: '2026-10-14',
      resumen: { minimo: '1933.0000', maximo: '2133.0000', promedio: '2022.0000', cantidad: 3 },
    });
    expect(serie.items).toEqual([
      { fecha: '2026-11-10', valor: '2000.0000' },
      { fecha: '2026-11-12', valor: '1933.0000' },
      { fecha: '2026-11-13', valor: '2133.0000' },
    ]);
  });

  it('GET /api/precios/serie acepta una serie explícita y un rango', async () => {
    const mercados = await get<MercadoDto[]>('/api/mercados');
    const bogota = mercados.find((m) => m.nombre.startsWith('Bogotá'))!;
    const serie = await get<SeriePrecioDto>(
      `/api/precios/serie?producto=platano&fuente=sipsa&presentacion=${encodeURIComponent('guineo')}&mercado=${bogota.id}&desde=2026-11-11&hasta=2026-11-13`,
    );
    expect(serie.items.map((p) => p.valor)).toEqual(['2250.0000', '2250.0000', '2250.0000']);
    await request(app.getHttpServer())
      .get('/api/precios/serie?producto=platano&fuente=sipsa')
      .expect(400);
    await request(app.getHttpServer()).get('/api/precios/serie?producto=aguacate').expect(404);
  });

  it('GET /api/precios/comparativo ordena por precio y compara contra Neiva', async () => {
    const comp = await get<ComparativoDto>('/api/precios/comparativo?producto=platano');
    expect(comp).toMatchObject({
      presentacion: 'hartón verde',
      fecha: '2026-11-13',
      unidad: 'kg',
      fuente: { slug: 'sipsa', cita: CITA_DANE },
      referencia: { nombre: 'Neiva, Surabastos', valor: '2133.0000' },
    });
    expect(
      comp.items.map((i) => [i.mercado.nombre, i.valor, i.diferenciaPct, i.esReferencia]),
    ).toEqual([
      ['Bogotá, D.C., Corabastos', '3250.0000', '52.37', false],
      ['Neiva, Surabastos', '2133.0000', '0.00', true],
    ]);
  });

  it('el comparativo usa el siguiente mercado preferido si Neiva no tiene dato ese día', async () => {
    const comp = await get<ComparativoDto>(
      '/api/precios/comparativo?producto=platano&fecha=2026-11-11',
    );
    expect(comp.referencia?.nombre).toBe('Bogotá, D.C., Corabastos');
    expect(comp.items).toHaveLength(1);
    const vacio = await get<ComparativoDto>(
      '/api/precios/comparativo?producto=platano&fecha=2020-01-01',
    );
    expect(vacio).toMatchObject({ fecha: null, items: [], referencia: null });
  });
});
