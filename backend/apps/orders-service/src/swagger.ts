import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configura la documentación OpenAPI (Swagger) de orders-service.
 * Publica la interfaz en /docs y el documento JSON en /docs-json.
 * @param app - Aplicación de Nest ya creada.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AgroTrace - orders-service')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}
