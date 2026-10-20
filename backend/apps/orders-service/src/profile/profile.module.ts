import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UsersClient } from './users.client';
import { Order } from '../entities/order.entity';

/**
 * Módulo de perfil (`ProfileModule`).
 * Agrupa controladores, servicios, la entidad de órdenes para calcular estadísticas 
 * y el cliente TCP para comunicarse con el microservicio de usuarios.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    // TCP de users-service, de donde se toman los datos del usuario
    ClientsModule.register([
      {
        name: 'USERS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.USERS_SERVICE_HOST || 'localhost',
          port:
            Number.parseInt(process.env.USERS_SERVICE_PORT as string, 10) ||
            3001,
        },
      },
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService, UsersClient],
})
export class ProfileModule {}
