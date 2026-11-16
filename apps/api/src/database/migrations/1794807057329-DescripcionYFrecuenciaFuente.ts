import { MigrationInterface, QueryRunner } from "typeorm";

// Etapa 1 (aprobado por el autor el 2026-11-16):
// - fuente.descripcion (RF-06).
// - fuente.frecuencia pasa a un enum propio "frecuencia_fuente" con A_DEMANDA (fuente manual).
//   observacion_precio.periodicidad conserva el enum "frecuencia" (A_DEMANDA no es una periodicidad).
// Revisión manual: TypeORM generaba "ALTER TYPE frecuencia ADD VALUE 'A_DEMANDA'", que habría
// cambiado también la periodicidad de las observaciones, y un down inconsistente.
export class DescripcionYFrecuenciaFuente1794807057329 implements MigrationInterface {
    name = 'DescripcionYFrecuenciaFuente1794807057329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "fuente"
            ADD "descripcion" text
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."frecuencia_fuente" AS ENUM('DIARIA', 'SEMANAL', 'MENSUAL', 'ANUAL', 'A_DEMANDA')
        `);
        await queryRunner.query(`
            ALTER TABLE "fuente"
            ALTER COLUMN "frecuencia" TYPE "public"."frecuencia_fuente"
            USING "frecuencia"::text::"public"."frecuencia_fuente"
        `);
        await queryRunner.query(`
            UPDATE "fuente" SET "frecuencia" = 'A_DEMANDA' WHERE "tipo" = 'MANUAL'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE "fuente" SET "frecuencia" = 'DIARIA' WHERE "frecuencia" = 'A_DEMANDA'
        `);
        await queryRunner.query(`
            ALTER TABLE "fuente"
            ALTER COLUMN "frecuencia" TYPE "public"."frecuencia"
            USING "frecuencia"::text::"public"."frecuencia"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."frecuencia_fuente"
        `);
        await queryRunner.query(`
            ALTER TABLE "fuente" DROP COLUMN "descripcion"
        `);
    }

}
