import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from 'typeorm';
import { Fuente } from '../../catalogo/entities/fuente.entity.js';

/** Tasa de cambio diaria (p. ej. TRM: 1 USD = valor COP). */
@Entity('tasa_cambio')
export class TasaCambio {
  /** Fecha de vigencia (YYYY-MM-DD, zona America/Bogota). */
  @PrimaryColumn({ type: 'date', primaryKeyConstraintName: 'pk_tasa_cambio' })
  fecha: string;

  @PrimaryColumn({
    name: 'moneda_origen',
    type: 'char',
    length: 3,
    primaryKeyConstraintName: 'pk_tasa_cambio',
  })
  monedaOrigen: string;

  @PrimaryColumn({
    name: 'moneda_destino',
    type: 'char',
    length: 3,
    primaryKeyConstraintName: 'pk_tasa_cambio',
  })
  monedaDestino: string;

  /** Decimal como texto: no usar `number` para montos. */
  @Column({ type: 'numeric', precision: 18, scale: 6 })
  valor: string;

  @Column({ name: 'fuente_id', type: 'integer' })
  fuenteId: number;

  @ManyToOne(() => Fuente, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fuente_id', foreignKeyConstraintName: 'fk_tasa_cambio_fuente' })
  fuente: Relation<Fuente>;
}
