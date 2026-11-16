// DataSource para el CLI de TypeORM (migraciones). Se usa compilado desde dist:
//   npm run migration:run -w apps/api
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { cargarArchivoEnv } from '../config/archivo-env.js';
import { validarEntorno } from '../config/variables-entorno.js';
import { crearOpcionesTypeorm } from './opciones-typeorm.js';

cargarArchivoEnv();

export default new DataSource(crearOpcionesTypeorm(validarEntorno(process.env)));
