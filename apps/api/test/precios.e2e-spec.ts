import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type ObservacionPrecioDto, type PreciosHoyDto } from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { crearAplicacion, iniciarSesionAdmin, prepararBaseDatosPruebas } from './utilidades.js';

const FIXTURE_TRM = readFileSync(join(import.meta.dirname, 'fixtures/trm/ultimas-40.json'), 'utf8');

// DATO DE EJEMPLO: valores con la forma de los reales, solo para pruebas.
const CAFE_12_NOV = {
  producto: 'cafe',
  fuente: 'fnc',
  fecha: '2026-11-12',
  presentacion: 'pergamino seco',
  valor: '2050000',
  moneda: 'COP',
  unidad: 'carga 125 kg',
  referencia: 'DATO DE EJEMPLO',
};
const CAFE_13_NOV = { ...CAFE_12_NOV, fecha: '2026-11-13', valor: '2075000' };

describe('Precios: carga manual y precio del día (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let idMercadoNy: number;

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
    token = await iniciarSesionAdmin(app);

    // TRM real (fixture) para calcular los derivados en USD.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(FIXTURE_TRM)));
    await request(app.getHttpServer())
      .post('/api/admin/ingesta/trm')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    vi.unstubAllGlobals();

    const [mercado] = await app
      .get(DataSource)
      .query<{ id: number }[]>("SELECT id FROM mercado WHERE nombre = 'Bolsa de Nueva York (ICE)'");
    idMercadoNy = mercado!.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  const cargar = (cuerpo: object) =>
    request(app.getHttpServer())
      .post('/api/admin/precios')
      .set('Authorization', `Bearer ${token}`)
      .send(cuerpo);

  it('sin datos, /precios/hoy lista todos los productos como pendientes', async () => {
    const res = await request(app.getHttpServer()).get('/api/precios/hoy').expect(200);
    const hoy = res.body as PreciosHoyDto;
    expect(hoy.items).toEqual([]);
    expect(hoy.sinDatos.map((p) => p.slug)).toEqual([
      'cafe',
      'platano',
      'banano',
      'cacao',
      'pitaya',
    ]);
    expect(hoy.trm?.fuente.licencia).toContain('CC BY-SA');
    expect(res.headers['cache-control']).toContain('max-age=');
  });

  it('la carga manual exige token', async () => {
    await request(app.getHttpServer()).post('/api/admin/precios').send(CAFE_12_NOV).expect(401);
  });

  it('guarda el valor original y calcula COP/kg y USD/kg con la TRM de la fecha', async () => {
    const res = await cargar(CAFE_12_NOV).expect(201);
    const obs = res.body as ObservacionPrecioDto;

    expect(obs).toMatchObject({
      producto: { slug: 'cafe' },
      fuente: { slug: 'fnc' },
      mercado: null,
      fecha: '2026-11-12',
      periodicidad: 'DIARIA',
      presentacion: 'pergamino seco',
      valor: '2050000.0000',
      moneda: 'COP',
      unidad: 'carga 125 kg',
      // 2.050.000 / 125 = 16.400 COP/kg; / TRM 3297.07 (12-nov) = 4.9741 USD/kg
      valorCopKg: '16400.0000',
      valorUsdKg: '4.9741',
      anulado: false,
    });
  });

  it('rechaza un duplicado activo con 409', async () => {
    await cargar(CAFE_12_NOV).expect(409);
  });

  it('valida el cuerpo', async () => {
    await cargar({ ...CAFE_13_NOV, valor: '2.075.000' }).expect(400);
    await cargar({ ...CAFE_13_NOV, unidad: 'bulto' }).expect(400);
    await cargar({ ...CAFE_13_NOV, fecha: '2999-01-01' }).expect(400);
    await cargar({ ...CAFE_13_NOV, fecha: '2026-02-30' }).expect(400);
    await cargar({ ...CAFE_13_NOV, producto: 'aguacate' }).expect(400);
    await cargar({ ...CAFE_13_NOV, mercadoId: 99999 }).expect(400);
    await cargar({ ...CAFE_13_NOV, campoExtra: 1 }).expect(400);
    // Texto que llegó en otra codificación (carácter de reemplazo U+FFFD).
    await cargar({ ...CAFE_13_NOV, presentacion: 'verde ar\uFFFDbica' }).expect(400);
  });

  it('muestra el café del día con variación y el cierre de Nueva York', async () => {
    await cargar(CAFE_13_NOV).expect(201);
    await cargar({
      producto: 'cafe',
      fuente: 'fnc',
      mercadoId: idMercadoNy,
      fecha: '2026-11-13',
      presentacion: 'verde arábica (contrato C)',
      valor: '278.65',
      moneda: 'USD',
      unidad: 'USc/lb',
      referencia: 'DATO DE EJEMPLO',
    }).expect(201);

    const res = await request(app.getHttpServer()).get('/api/precios/hoy').expect(200);
    const hoy = res.body as PreciosHoyDto;
    const cafe = hoy.items.find((i) => i.producto.slug === 'cafe');

    expect(cafe).toMatchObject({
      fuente: { slug: 'fnc' },
      mercado: null,
      fecha: '2026-11-13',
      valor: '2075000.0000',
      unidad: 'carga 125 kg',
      variacion: { absoluta: '25000.0000', porcentaje: '1.22', fechaAnterior: '2026-11-12' },
    });
    expect(cafe?.complementos).toEqual([
      expect.objectContaining({
        etiqueta: 'Bolsa de Nueva York',
        mercado: { nombre: 'Bolsa de Nueva York (ICE)' },
        valor: '278.6500',
        moneda: 'USD',
        unidad: 'USc/lb',
        variacion: null,
      }),
    ]);
    expect(hoy.sinDatos.map((p) => p.slug)).not.toContain('cafe');
  });

  it('anula con motivo y el precio del día vuelve al dato anterior', async () => {
    const res = await request(app.getHttpServer()).get('/api/precios/hoy');
    const actual = await app
      .get(DataSource)
      .query<{ id: string }[]>(
        "SELECT id FROM observacion_precio WHERE fecha = '2026-11-13' AND presentacion = 'pergamino seco'",
      );
    const id = actual[0]!.id;
    expect((res.body as PreciosHoyDto).items[0]?.fecha).toBe('2026-11-13');

    const anulada = await request(app.getHttpServer())
      .patch(`/api/admin/precios/${id}/anular`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo: 'Valor digitado por error (prueba)' })
      .expect(200);
    expect(anulada.body).toMatchObject({
      anulado: true,
      motivoAnulacion: 'Valor digitado por error (prueba)',
    });

    await request(app.getHttpServer())
      .patch(`/api/admin/precios/${id}/anular`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo: 'Segunda vez' })
      .expect(409);

    const despues = (await request(app.getHttpServer()).get('/api/precios/hoy'))
      .body as PreciosHoyDto;
    expect(despues.items[0]).toMatchObject({ fecha: '2026-11-12', variacion: null });

    // Corrección: reutiliza la fila anulada y guarda el valor anterior en el historial.
    const corregida = await cargar({ ...CAFE_13_NOV, valor: '2076000' }).expect(201);
    expect(corregida.body).toMatchObject({ id, valor: '2076000.0000', anulado: false });
    const [fila] = await app
      .get(DataSource)
      .query<{ metadata: { historial: { valorAnterior: string }[] } }[]>(
        'SELECT metadata FROM observacion_precio WHERE id = $1',
        [id],
      );
    expect(fila!.metadata.historial[0]?.valorAnterior).toBe('2075000.0000');
  });

  it('valida el motivo de anulación', async () => {
    await request(app.getHttpServer())
      .patch('/api/admin/precios/1/anular')
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo: '' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/admin/precios/999999/anular')
      .set('Authorization', `Bearer ${token}`)
      .send({ motivo: 'No existe esta observación' })
      .expect(404);
  });
});
