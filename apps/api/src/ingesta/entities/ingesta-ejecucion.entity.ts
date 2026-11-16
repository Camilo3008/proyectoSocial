import { type DisparoIngesta, type EstadoIngesta } from '@agroprecios/shared';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { Fuente } from '../../catalogo/entities/fuente.entity.js';
import { DISPAROS_INGESTA, ESTADOS_INGESTA } from '../../common/enums.js';

/** Bitácora: una fila por cada ejecución de ingesta de una fuente. */
@Entity('ingesta_ejecucion')
// Índice (fuente_id, inicio DESC): se crea a mano en la migración.
@Index('idx_ingesta_ejecucion_fuente_inicio', { synchronize: false })
export class IngestaEjecucion {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_ingesta_ejecucion' })
  id: number;

  @Column({ name: 'fuente_id', type: 'integer' })
  fuenteId: number;

  @ManyToOne(() => Fuente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fuente_id', foreignKeyConstraintName: 'fk_ingesta_ejecucion_fuente' })
  fuente: Relation<Fuente>;

  @Column({ type: 'enum', enum: DISPAROS_INGESTA, enumName: 'disparo_ingesta' })
  disparo: DisparoIngesta;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  inicio: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fin: Date | null;

  @Column({
    type: 'enum',
    enum: ESTADOS_INGESTA,
    enumName: 'estado_ingesta',
    default: 'EN_CURSO',
  })
  estado: EstadoIngesta;

  @Column({ type: 'integer', default: 0 })
  leidos: number;

  @Column({ type: 'integer', default: 0 })
  insertados: number;

  @Column({ type: 'integer', default: 0 })
  actualizados: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  /** SHA-256 (hex) del payload descargado, para detectar descargas repetidas. */
  @Column({ name: 'payload_hash', type: 'char', length: 64, nullable: true })
  payloadHash: string | null;
}
