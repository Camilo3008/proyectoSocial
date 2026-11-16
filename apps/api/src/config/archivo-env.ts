import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Rutas candidatas del archivo .env. El archivo oficial vive en la raíz del
 * monorepo (lo comparte docker-compose); los comandos de la API se ejecutan
 * con cwd = apps/api.
 */
export function rutasArchivoEnv(): string[] {
  return [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')].filter((ruta) =>
    existsSync(ruta),
  );
}

/**
 * Carga el .env en process.env para procesos fuera de Nest (CLI de TypeORM,
 * seeds, pruebas). Las variables ya definidas en el entorno tienen prioridad.
 */
export function cargarArchivoEnv(): void {
  for (const ruta of rutasArchivoEnv()) {
    process.loadEnvFile(ruta);
  }
}
