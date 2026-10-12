import '../load-env';
import { NestFactory } from '@nestjs/core';
import { UsersServiceModule } from './users-service.module';
import { HttpToRpcExceptionFilter } from './filters/http-to-rpc-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const httpPort = Number.parseInt(process.env.HTTP_PORT as string, 10) || 3000;
  const tcpPort =
    Number.parseInt(process.env.MICROSERVICE_PORT as string, 10) || 3001;

  const app = await NestFactory.create(UsersServiceModule);
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
  // Solo en TCP: en HTTP, Nest ya responde con el status correcto
  microservice.useGlobalFilters(new HttpToRpcExceptionFilter());

  await app.startAllMicroservices();
  await app.listen(httpPort);

  Logger.log(`Users service HTTP running on port ${httpPort}`);
  Logger.log(`Users service TCP running on port ${tcpPort}`);
}
void bootstrap();
