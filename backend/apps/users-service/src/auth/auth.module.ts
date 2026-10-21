import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';

/**
 * Módulo de autenticación (AuthModule).
 * Agrupa y encapsula los controladores, servicios y entidades relacionados 
 * con el inicio de sesión, registro y gestión de tokens del microservicio de usuarios.
 */
@Module({
  /**
   * Importación de los módulos y repositorios de TypeORM necesarios 
   * para interactuar con las tablas de usuarios y tokens de refresco en la base de datos.
   */
  imports: [TypeOrmModule.forFeature([User, RefreshToken])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

