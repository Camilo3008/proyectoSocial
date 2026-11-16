import { type TipoMercado } from '@agroprecios/shared';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { TIPOS_MERCADO } from '../../common/enums.js';
import { Fuente } from './fuente.entity.js';
import { Pais } from './pais.entity.js';

@Entity('mercado')
@Unique('uq_mercado_nombre_pais', ['nombre', 'paisIso3'])
// Identidad del mercado en su fuente (p. ej. SIPSA fuenId 22 = Neiva, Surabastos).
// Es la clave del upsert al ingerir; los mercados sin código (sembrados a mano) quedan fuera.
@Index('uq_mercado_fuente_codigo', ['fuenteId', 'codigoExterno'], {
  unique: true,
  where: 'codigo_externo IS NOT NULL',
})
export class Mercado {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_mercado' })
  id: number;

  /** Nombre tal como lo publica la fuente. */
  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  /** Fuente que identifica a este mercado (null si se sembró a mano). */
  @Column({ name: 'fuente_id', type: 'integer', nullable: true })
  fuenteId: number | null;

  @ManyToOne(() => Fuente, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fuente_id', foreignKeyConstraintName: 'fk_mercado_fuente' })
  fuente: Relation<Fuente> | null;

  /** Código del mercado en la fuente (p. ej. fuenId de SIPSA). */
  @Column({ name: 'codigo_externo', type: 'varchar', length: 50, nullable: true })
  codigoExterno: string | null;

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
