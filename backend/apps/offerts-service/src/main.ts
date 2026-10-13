import '../load-env';
import { NestFactory } from '@nestjs/core';
import { OffertsServiceModule } from './offerts-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const httpPort = Number.parseInt(process.env.HTTP_PORT as string, 10) || 3004;
  const tcpPort =
    Number.parseInt(process.env.MICROSERVICE_PORT as string, 10) || 3005;

  const app = await NestFactory.create(OffertsServiceModule);
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

  Logger.log(`Offerts service HTTP running on port ${httpPort}`);
  Logger.log(`Offerts service TCP running on port ${tcpPort}`);
}
void bootstrap();
