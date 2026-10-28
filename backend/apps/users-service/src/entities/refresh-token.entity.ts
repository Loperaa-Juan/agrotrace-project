import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { User } from './user.entity';
/**
 * Entidad que representa los tokens de actualización (Refresh Tokens)
 * asociados a las sesiones activas de los usuarios para el manejo seguro de JWT.
 */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  token: string; // Token actual

  @Column()
  userId: string;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  isRevoked: boolean; // Para revocar el token que se tenga actualmente

  // Relación de muchos a uno: Muchos tokens pueden pertenecer a un usuario
  @ManyToOne(() => User, (user) => user.refreshTokens, {
    onDelete: 'CASCADE', // Si el usuario es eliminado, los tokens también.
  })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;
}
