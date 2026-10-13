import '../load-env';
import { NestFactory } from '@nestjs/core';
import { CatalogServiceModule } from './catalog-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const httpPort = Number.parseInt(process.env.HTTP_PORT as string, 10) || 3002;
  const tcpPort =
    Number.parseInt(process.env.MICROSERVICE_PORT as string, 10) || 3003;

  const app = await NestFactory.create(CatalogServiceModule);
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
