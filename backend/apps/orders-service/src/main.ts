import '../load-env';
import { NestFactory } from '@nestjs/core';
import { OrdersServiceModule } from './orders-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './swagger';

/**
 * Punto de entrada principal (bootstrap) de orders-service. Configura HTTP, CORS, Pipes y microservicio TCP.
 */
async function bootstrap() {
  const httpPort = Number.parseInt(process.env.HTTP_PORT as string, 10) || 3004;
  const tcpPort =
    Number.parseInt(process.env.MICROSERVICE_PORT as string, 10) || 3005;

  const app = await NestFactory.create(OrdersServiceModule);

  // CORS: orígenes del frontend separados por coma en CORS_ORIGIN (ej. http://localhost:5173).
  // Sin la variable se acepta cualquier origen: útil en desarrollo, en producción hay que definirla
  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ??
      true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Swagger: interfaz en /docs y documento OpenAPI en /docs-json
  setupSwagger(app);

  // TCP: comunicación interna con los demás microservicios
  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.HOST || '0.0.0.0',
      port: tcpPort,
    },
  });
  microservice.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.startAllMicroservices();
  await app.listen(httpPort);

  Logger.log(`Orders service HTTP running on port ${httpPort}`);
  Logger.log(`Orders service TCP running on port ${tcpPort}`);
}
void bootstrap();
