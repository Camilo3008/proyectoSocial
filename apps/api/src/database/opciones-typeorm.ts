import type { DataSourceOptions } from 'typeorm';
import { Entorno, type VariablesEntorno } from '../config/variables-entorno.js';
import { ENTIDADES } from './entidades.js';
import { MIGRACIONES } from './migraciones.js';

/**
 * Opciones de TypeORM compartidas por la aplicación, el CLI de migraciones,
 * los seeds y las pruebas e2e. `synchronize` está SIEMPRE desactivado:
 * todo cambio de esquema se hace con una migración revisada.
 */
export type ConfigBaseDatos = Pick<
  VariablesEntorno,
  'NODE_ENV' | 'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME'
>;

export function crearOpcionesTypeorm(
  env: ConfigBaseDatos,
  nombreBaseDatos: string = env.DB_NAME,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: nombreBaseDatos,
    entities: ENTIDADES,
    migrations: MIGRACIONES,
    migrationsTableName: 'migraciones',
    synchronize: false,
    migrationsRun: false,
    logging: env.NODE_ENV === Entorno.Desarrollo ? ['error', 'warn', 'migration'] : ['error'],
    applicationName: 'agroprecios-api',
  };
}
