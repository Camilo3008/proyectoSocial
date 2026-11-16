import { type Frecuencia, type TipoFuente } from '@agroprecios/shared';
import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { FRECUENCIAS, TIPOS_FUENTE } from '../../common/enums.js';

@Entity('fuente')
@Unique('uq_fuente_slug', ['slug'])
export class Fuente {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_fuente' })
  id: number;

  /** Identificador estable usado por los adapters y la API (fnc, sipsa, …). */
  @Column({ type: 'varchar', length: 30 })
  slug: string;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: TIPOS_FUENTE, enumName: 'tipo_fuente' })
  tipo: TipoFuente;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  /** null mientras no se haya verificado (ver docs/fuentes/<slug>.md). */
  @Column({ type: 'text', nullable: true })
  licencia: string | null;

  @Column({ type: 'enum', enum: FRECUENCIAS, enumName: 'frecuencia' })
  frecuencia: Frecuencia;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
