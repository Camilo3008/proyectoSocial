import { type SesionDto } from '@agroprecios/shared';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { ADMIN_E2E, crearAplicacion, prepararBaseDatosPruebas } from './utilidades.js';

// El login permite 5 intentos por minuto: el orden de las pruebas importa.
describe('Autenticación del administrador (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await prepararBaseDatosPruebas();
    app = await crearAplicacion();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('entrega un JWT con fecha de vencimiento al iniciar sesión', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(ADMIN_E2E)
      .expect(200);
    const sesion = res.body as SesionDto;

    expect(sesion.tokenType).toBe('Bearer');
    expect(sesion.accessToken.split('.')).toHaveLength(3);
    const minutos = (new Date(sesion.expiraEn).getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(0);
    expect(minutos).toBeLessThanOrEqual(15);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('acepta el correo sin importar mayúsculas', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...ADMIN_E2E, email: ADMIN_E2E.email.toUpperCase() })
      .expect(200);
  });

  it('rechaza una contraseña incorrecta con un mensaje genérico', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...ADMIN_E2E, password: 'no-es-la-clave' })
      .expect(401);
    expect((res.body as { message: string }).message).toBe('Correo o contraseña incorrectos');
  });

  it('rechaza un correo inexistente con el mismo mensaje', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nadie@example.com', password: 'cualquier-cosa' })
      .expect(401);
    expect((res.body as { message: string }).message).toBe('Correo o contraseña incorrectos');
  });

  it('valida el cuerpo (5.º intento del minuto)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-es-correo', password: 'x' })
      .expect(400);
  });

  it('bloquea el 6.º intento en el mismo minuto (fuerza bruta)', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send(ADMIN_E2E).expect(429);
  });
});
