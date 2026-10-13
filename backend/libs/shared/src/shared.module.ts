import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ValidationService } from './services/validation.service';

// Lógica compartida entre microservicios. Cada servicio que la importe puede definir en su .env
// USERS_SERVICE_HOST y USERS_SERVICE_PORT (TCP de users-service)
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
