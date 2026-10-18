import '../load-env';
import { NestFactory } from '@nestjs/core';
import { UsersServiceModule } from './users-service.module';
import { HttpToRpcExceptionFilter } from './filters/http-to-rpc-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
/**
 * Archivo de entrada en el cual se configuran elementos globales y ubica el puerto
 * especifico para recibir peticiones 
 */
async function bootstrap() {
  const httpPort = Number.parseInt(process.env.HTTP_PORT as string, 10) || 3000;
  const tcpPort =
    Number.parseInt(process.env.MICROSERVICE_PORT as string, 10) || 3001;

  const app = await NestFactory.create(UsersServiceModule);

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
  // Solo en TCP: en HTTP, Nest ya responde con el status correcto
  microservice.useGlobalFilters(new HttpToRpcExceptionFilter());

  await app.startAllMicroservices();
  await app.listen(httpPort);

  Logger.log(`Users service HTTP running on port ${httpPort}`);
  Logger.log(`Users service TCP running on port ${tcpPort}`);
}
void bootstrap();
