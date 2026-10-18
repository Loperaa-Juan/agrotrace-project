import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ValidationService } from './services/validation.service';

/**
 * Módulo con la lógica compartida entre microservicios. Registra el cliente TCP
 * `USERS_SERVICE` y exporta {@link ValidationService}.
 *
 * Cada servicio que lo importe puede definir en su `.env`:
 * - `USERS_SERVICE_HOST`: host TCP de users-service (por defecto `localhost`).
 * - `USERS_SERVICE_PORT`: puerto TCP de users-service (por defecto `3001`).
 */
@Module({
  imports: [
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
  providers: [ValidationService],
  exports: [ValidationService],
})
export class SharedModule {}
