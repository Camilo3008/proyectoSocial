import { type Frecuencia } from '@agroprecios/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioAdmin } from '../../auth/entities/usuario-admin.entity.js';
import { Fuente } from '../../catalogo/entities/fuente.entity.js';
import { Mercado } from '../../catalogo/entities/mercado.entity.js';
import { Pais } from '../../catalogo/entities/pais.entity.js';
import { Producto } from '../../catalogo/entities/producto.entity.js';
import { FRECUENCIAS } from '../../common/enums.js';
import { IngestaEjecucion } from '../../ingesta/entities/ingesta-ejecucion.entity.js';

/**
 * Observación de precio. Guarda SIEMPRE el valor original de la fuente
 * (valor, moneda, unidad, presentación); los valores por kg son derivados.
 * Nunca se borra físicamente: se anula con un motivo.
 *
 * Los índices con expresiones (COALESCE) u orden DESC no los soporta el
 * decorador; se crean a mano en la migración y se marcan synchronize: false.
 */
@Entity('observacion_precio')
// UNIQUE (producto_id, fuente_id, COALESCE(mercado_id,0), COALESCE(pais_iso3,''),
//         fecha, periodicidad, presentacion) -> clave del upsert idempotente.
@Index('uq_observacion_precio_clave', { synchronize: false })
@Index('idx_observacion_precio_producto_fecha', { synchronize: false })
@Index('idx_observacion_precio_pais_producto_fecha', { synchronize: false })
export class ObservacionPrecio {
  /** bigint: TypeORM lo devuelve como string. */
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    primaryKeyConstraintName: 'pk_observacion_precio',
  })
  id: string;

  @Column({ name: 'producto_id', type: 'integer' })
  productoId: number;

  @ManyToOne(() => Producto, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id', foreignKeyConstraintName: 'fk_observacion_precio_producto' })
  producto: Relation<Producto>;

  @Column({ name: 'fuente_id', type: 'integer' })
  fuenteId: number;

  @ManyToOne(() => Fuente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fuente_id', foreignKeyConstraintName: 'fk_observacion_precio_fuente' })
  fuente: Relation<Fuente>;

  @Column({ name: 'mercado_id', type: 'integer', nullable: true })
  mercadoId: number | null;

  @ManyToOne(() => Mercado, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'mercado_id', foreignKeyConstraintName: 'fk_observacion_precio_mercado' })
  mercado: Relation<Mercado> | null;

  @Column({ name: 'pais_iso3', type: 'char', length: 3, nullable: true })
  paisIso3: string | null;

  @ManyToOne(() => Pais, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'pais_iso3', foreignKeyConstraintName: 'fk_observacion_precio_pais' })
  pais: Relation<Pais> | null;

  /** Fecha del dato (YYYY-MM-DD). Para series mensuales/anuales: primer día del periodo. */
  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'enum', enum: FRECUENCIAS, enumName: 'frecuencia' })
  periodicidad: Frecuencia;

  /** P. ej. "pergamino seco", "verde arábica". No se convierte entre presentaciones. */
  @Column({ type: 'varchar', length: 100 })
  presentacion: string;

  /** Valor ORIGINAL de la fuente (decimal como texto). */
  @Column({ type: 'numeric', precision: 18, scale: 4 })
  valor: string;

  /** ISO 4217 (COP, USD, …). */
  @Column({ type: 'char', length: 3 })
  moneda: string;

  /** Unidad original (p. ej. "carga 125 kg", "kg", "lb"). */
  @Column({ type: 'varchar', length: 50 })
  unidad: string;

  @Column({ name: 'valor_cop_kg', type: 'numeric', precision: 18, scale: 4, nullable: true })
  valorCopKg: string | null;

  @Column({ name: 'valor_usd_kg', type: 'numeric', precision: 18, scale: 4, nullable: true })
  valorUsdKg: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ingesta_id', type: 'integer', nullable: true })
  ingestaId: number | null;

  @ManyToOne(() => IngestaEjecucion, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingesta_id', foreignKeyConstraintName: 'fk_observacion_precio_ingesta' })
  ingesta: Relation<IngestaEjecucion> | null;

  @Column({ name: 'creado_por', type: 'integer', nullable: true })
  creadoPorId: number | null;

  @ManyToOne(() => UsuarioAdmin, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'creado_por', foreignKeyConstraintName: 'fk_observacion_precio_creado_por' })
  creadoPor: Relation<UsuarioAdmin> | null;

  @Column({ type: 'boolean', default: false })
  anulado: boolean;

  @Column({ name: 'motivo_anulacion', type: 'text', nullable: true })
  motivoAnulacion: string | null;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamptz' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en', type: 'timestamptz' })
  actualizadoEn: Date;
}
