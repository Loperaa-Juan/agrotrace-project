import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';

/**
 * Módulo de usuarios
 * Agrupa los componentes internos encargados de la gestión de perfiles, 
 * consultas de base de datos y comunicación por patrones de mensajes para los usuarios.
 */
@Module({
  /**
   * Importa el repositorio de TypeORM para la entidad `User`, 
   * permitiendo que el servicio interactúe con la tabla de usuarios en la base de datos.
   */
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
