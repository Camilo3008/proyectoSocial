import { type MigrationInterface } from 'typeorm';
import { Inicial1794805198361 } from './migrations/1794805198361-Inicial.js';

// Lista explícita de migraciones, en orden. Al generar una migración nueva
// (npm run migration:generate -w apps/api -- src/database/migrations/<Nombre>),
// revisarla y agregarla al final de este arreglo.
export const MIGRACIONES: (new () => MigrationInterface)[] = [Inicial1794805198361];
