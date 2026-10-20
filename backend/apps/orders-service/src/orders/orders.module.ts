import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CatalogClient } from './catalog.client';
import { Order } from '../entities/order.entity';

/**
 * Módulo principal de órdenes (`OrdersModule`).
 * Agrupa los controladores, servicios, la entidad de base de datos de órdenes 
 * y la configuración del cliente TCP para comunicarse con el microservicio de catálogo.
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
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CatalogClient],
})
export class OrdersModule {}
