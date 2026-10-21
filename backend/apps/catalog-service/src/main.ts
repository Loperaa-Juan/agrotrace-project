import '../load-env';
import { NestFactory } from '@nestjs/core';
import { CatalogServiceModule } from './catalog-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';

/**
 * Función principal de arranque (Bootstrap) para catalog-service.
 * Configura el servidor HTTP para endpoints públicos y protegidos, así como el transporte TCP para microservicios.
 */
async function bootstrap() {
  const httpPort = Number.parseInt(process.env.HTTP_PORT as string, 10) || 3002;
  const tcpPort =
    Number.parseInt(process.env.MICROSERVICE_PORT as string, 10) || 3003;

  const app = await NestFactory.create(CatalogServiceModule);

  // CORS: orígenes del frontend separados por coma en CORS_ORIGIN (ej. http://localhost:5173).
  // Sin la variable se acepta cualquier origen: útil en desarrollo, en producción hay que definirla
  app.enableCors({
    origin:
      process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ??
      true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

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

  Logger.log(`Catalog service HTTP running on port ${httpPort}`);
  Logger.log(`Catalog service TCP running on port ${tcpPort}`);
}
void bootstrap();
