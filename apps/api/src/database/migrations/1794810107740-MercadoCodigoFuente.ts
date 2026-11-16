import { MigrationInterface, QueryRunner } from "typeorm";

// Etapa 2 (aprobado por el autor el 2026-11-16): identidad del mercado en su fuente
// (fuente_id + codigo_externo, único cuando hay código) y conteo de mercados nuevos por
// ejecución de ingesta. Generada con migration:generate y revisada: sin cambios manuales.
export class MercadoCodigoFuente1794810107740 implements MigrationInterface {
    name = 'MercadoCodigoFuente1794810107740'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "mercado"
            ADD "fuente_id" integer
        `);
        await queryRunner.query(`
            ALTER TABLE "mercado"
            ADD "codigo_externo" character varying(50)
        `);
        await queryRunner.query(`
            ALTER TABLE "ingesta_ejecucion"
            ADD "mercados_nuevos" integer NOT NULL DEFAULT '0'
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "uq_mercado_fuente_codigo" ON "mercado" ("fuente_id", "codigo_externo")
            WHERE codigo_externo IS NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "mercado"
            ADD CONSTRAINT "fk_mercado_fuente" FOREIGN KEY ("fuente_id") REFERENCES "fuente"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "mercado" DROP CONSTRAINT "fk_mercado_fuente"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."uq_mercado_fuente_codigo"
        `);
        await queryRunner.query(`
            ALTER TABLE "ingesta_ejecucion" DROP COLUMN "mercados_nuevos"
        `);
        await queryRunner.query(`
            ALTER TABLE "mercado" DROP COLUMN "codigo_externo"
        `);
        await queryRunner.query(`
            ALTER TABLE "mercado" DROP COLUMN "fuente_id"
        `);
    }

}
