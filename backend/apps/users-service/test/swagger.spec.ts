import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { UsersServiceController } from '../src/users-service.controller';
import { UsersServiceService } from '../src/users-service.service';
import { setupSwagger } from '../src/swagger';

// Prueba el documento OpenAPI que genera Swagger (sin BD: el servicio es falso)
describe('Documentación Swagger de users-service', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersServiceController],
      providers: [{ provide: UsersServiceService, useValue: {} }],
    }).compile();

    app = module.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // Pide el documento OpenAPI tal como lo recibe el navegador
  const obtenerDocumento = async () => {
    const response = await request(app.getHttpServer()).get('/docs-json');
    return response.body;
  };

  it('publica el documento OpenAPI en /docs-json', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json');

    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe('AgroTrace - users-service');
  });

  it('define el esquema de seguridad Bearer con JWT', async () => {
    const documento = await obtenerDocumento();

    expect(documento.components.securitySchemes.bearer).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  describe('ruta de estado /', () => {
    it('tiene un resumen', async () => {
      const documento = await obtenerDocumento();

      expect(documento.paths['/'].get.summary).toEqual(expect.any(String));
    });

    it('es pública y responde 200', async () => {
      const documento = await obtenerDocumento();
      const operacion = documento.paths['/'].get;

      expect(operacion.security).toBeUndefined();
      expect(Object.keys(operacion.responses)).toEqual(['200']);
    });
  });
});
