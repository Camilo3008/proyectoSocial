import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { validarEntorno } from '../src/config/variables-entorno.js';
import { configurarAplicacion } from '../src/configurar-aplicacion.js';
import { crearOpcionesTypeorm } from '../src/database/opciones-typeorm.js';
import { sembrarCatalogo } from '../src/database/seeds/sembrar-catalogo.js';

/**
 * Deja la base de pruebas en un estado conocido: borra el esquema, aplica
 * todas las migraciones y siembra el catálogo. Protegido para no tocar nunca
 * una base cuyo nombre no termine en "_test".
 */
export async function prepararBaseDatosPruebas(): Promise<void> {
  const env = validarEntorno(process.env);
  if (!env.DB_NAME.endsWith('_test')) {
    throw new Error(`Las pruebas e2e solo corren contra una base *_test (actual: ${env.DB_NAME})`);
  }
  const dataSource = new DataSource({ ...crearOpcionesTypeorm(env), dropSchema: true });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
    await sembrarCatalogo(dataSource, {
      email: 'admin-e2e@example.com',
      password: 'clave-solo-para-pruebas-e2e',
    });
  } finally {
    await dataSource.destroy();
  }
}

export async function crearAplicacion(): Promise<INestApplication<App>> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication<INestApplication<App>>({ logger: ['error'] });
  configurarAplicacion(app);
  await app.init();
  return app;
}
