import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('producto')
@Unique('uq_producto_slug', ['slug'])
export class Producto {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_producto' })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  slug: string;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  /** Unidad de referencia para los valores derivados (p. ej. "kg"). */
  @Column({ name: 'unidad_base', type: 'varchar', length: 20 })
  unidadBase: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;
}
