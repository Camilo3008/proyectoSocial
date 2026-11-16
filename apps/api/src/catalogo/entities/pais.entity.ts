import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

/** País según ISO 3166-1. */
@Entity('pais')
@Unique('uq_pais_iso2', ['iso2'])
export class Pais {
  @PrimaryColumn({ type: 'char', length: 3, primaryKeyConstraintName: 'pk_pais' })
  iso3: string;

  @Column({ type: 'char', length: 2 })
  iso2: string;

  @Column({ name: 'nombre_es', type: 'varchar', length: 100 })
  nombreEs: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string | null;

  /** Coordenadas de referencia (centroide) en grados decimales, como texto decimal. */
  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lat: string | null;

  @Column({ type: 'numeric', precision: 9, scale: 6, nullable: true })
  lng: string | null;
}
