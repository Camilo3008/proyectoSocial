import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
} from 'typeorm';
import { Fuente } from './fuente.entity.js';
import { Producto } from './producto.entity.js';

/** Mapea nuestros productos a los códigos de cada fuente. */
@Entity('producto_fuente')
@Unique('uq_producto_fuente_codigo', ['fuenteId', 'codigoExterno'])
export class ProductoFuente {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_producto_fuente' })
  id: number;

  @Column({ name: 'producto_id', type: 'integer' })
  productoId: number;

  @ManyToOne(() => Producto, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id', foreignKeyConstraintName: 'fk_producto_fuente_producto' })
  producto: Relation<Producto>;

  @Column({ name: 'fuente_id', type: 'integer' })
  fuenteId: number;

  @ManyToOne(() => Fuente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fuente_id', foreignKeyConstraintName: 'fk_producto_fuente_fuente' })
  fuente: Relation<Fuente>;

  /** Código del producto en la fuente (verificado y documentado en docs/fuentes). */
  @Column({ name: 'codigo_externo', type: 'varchar', length: 100 })
  codigoExterno: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  presentacion: string | null;

  @Column({ type: 'text', nullable: true })
  notas: string | null;
}
