import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('usuario_admin')
@Unique('uq_usuario_admin_email', ['email'])
export class UsuarioAdmin {
  @PrimaryGeneratedColumn('identity', { primaryKeyConstraintName: 'pk_usuario_admin' })
  id: number;

  /** Siempre en minúsculas. */
  @Column({ type: 'varchar', length: 254 })
  email: string;

  /** Hash bcrypt; nunca se expone en la API. */
  @Column({ name: 'hash_password', type: 'varchar', length: 100, select: false })
  hashPassword: string;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'ultimo_acceso', type: 'timestamptz', nullable: true })
  ultimoAcceso: Date | null;
}
