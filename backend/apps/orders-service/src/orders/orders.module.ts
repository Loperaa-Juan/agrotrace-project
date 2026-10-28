import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CatalogClient } from './catalog.client';
import { UsersClient } from '../profile/users.client';
import { Order } from '../entities/order.entity';

/**
 * Módulo principal de órdenes (`OrdersModule`).
 * Configura la persistencia de la entidad Order y registra los clientes TCP
 * para comunicarse con catalog-service y users-service.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    // TCP de catalog-service, de donde se toman los datos de la oferta
    ClientsModule.register([
      {
        name: 'CATALOG_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.CATALOG_SERVICE_HOST || 'localhost',
          port:
            Number.parseInt(process.env.CATALOG_SERVICE_PORT as string, 10) ||
            3003,
        },
      },
      // TCP de users-service, de donde se toman los datos del agricultor
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
  controllers: [OrdersController],
  providers: [OrdersService, CatalogClient, UsersClient],
})
export class OrdersModule {}
