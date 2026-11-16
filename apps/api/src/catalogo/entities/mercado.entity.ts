import { type TipoMercado } from '@agroprecios/shared';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { TIPOS_MERCADO } from '../../common/enums.js';
import { Pais } from './pais.entity.js';

@Entity('mercado')
@Unique('uq_mercado_nombre_pais', ['nombre', 'paisIso3'])
export class Mercado {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_mercado' })
  id: number;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ type: 'enum', enum: TIPOS_MERCADO, enumName: 'tipo_mercado' })
  tipo: TipoMercado;

  @Column({ type: 'varchar', length: 100, nullable: true })
  municipio: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  departamento: string | null;

  @Column({ name: 'pais_iso3', type: 'char', length: 3 })
  paisIso3: string;

  @ManyToOne(() => Pais, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'pais_iso3', foreignKeyConstraintName: 'fk_mercado_pais' })
  pais: Relation<Pais>;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng: string | null;
}
