// Se ejecuta antes de cada archivo e2e (setupFiles): apunta la API a la base de pruebas.
import { cargarArchivoEnv } from '../src/config/archivo-env.js';

cargarArchivoEnv();
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME_TEST ?? 'agroprecios_test';
// Evita que el rate limiting interfiera con las pruebas.
process.env.THROTTLE_LIMIT = '10000';
// Los jobs programados no deben correr durante las pruebas.
process.env.INGESTA_PROGRAMADA = 'false';
