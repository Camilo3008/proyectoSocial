// Ejecuta los seeds del catálogo:  npm run seed -w apps/api
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { cargarArchivoEnv } from '../../config/archivo-env.js';
import { validarEntorno } from '../../config/variables-entorno.js';
import { crearOpcionesTypeorm } from '../opciones-typeorm.js';
import { sembrarCatalogo } from './sembrar-catalogo.js';

cargarArchivoEnv();
const env = validarEntorno(process.env);
const dataSource = new DataSource(crearOpcionesTypeorm(env));

try {
  await dataSource.initialize();
  const resumen = await sembrarCatalogo(dataSource, {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });
  console.log('Seeds aplicados:', resumen);
  if (resumen.admin === 'omitido') {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD no definidos: no se creó el administrador.');
  }
} catch (error) {
  console.error('Error al ejecutar los seeds:', error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
