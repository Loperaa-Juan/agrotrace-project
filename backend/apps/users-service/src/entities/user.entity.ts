import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
  type Relation,
} from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { Role as UserRole } from '@app/shared';

// Definimos algunos enums para los campos de tipo de documento y Rol
export enum DocumentType {
  CC = 'CC', // Cédula de Ciudadanía
  NIT = 'NIT', // Número de Identificación Tributaria
  CE = 'CE', // Cédula de Extranjería
}

// Los roles se definen en @app/shared porque los demás servicios también los verifican (RolesGuard)
export { UserRole };

@Entity('user')
@Unique(['documentType', 'documentNumber'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: DocumentType })
  documentType: DocumentType;

  // varchar: conserva ceros a la izquierda y el dígito de verificación del NIT (ej. 900123456-7)
  @Column({ length: 20 })
  documentNumber: string;

  @Column({ unique: true })
  email: string;

  @Column({ length: 20 })
  phone: string;

  @Column()
  password: string; // Aquí se guarda la contraseña hasheada

  @Column()
  address: string;

  @Column()
  municipality: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relación de uno a muchos: Un usuario puede tener muchos tokens
  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: Relation<RefreshToken[]>;
}
