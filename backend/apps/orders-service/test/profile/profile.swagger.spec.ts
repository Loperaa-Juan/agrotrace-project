import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { ProfileController } from '../../src/profile/profile.controller';
import { ProfileService } from '../../src/profile/profile.service';
import { setupSwagger } from '../../src/swagger';

// Prueba la documentación Swagger de /profile (sin BD: el servicio es falso).
// Los guards se reemplazan porque aquí solo importa la documentación, no la autenticación
describe('Documentación Swagger de /profile', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

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

  describe('/profile/me get', () => {
    it('tiene un resumen y pide token Bearer', async () => {
      const documento = await obtenerDocumento();
      const operacion = documento.paths['/profile/me'].get;

      expect(operacion.summary).toEqual(expect.any(String));
      expect(operacion.security).toEqual([{ bearer: [] }]);
    });

    it('documenta las respuestas 200, 401, 403, 404 y 503', async () => {
      const documento = await obtenerDocumento();
      const respuestas = documento.paths['/profile/me'].get.responses;

      expect(Object.keys(respuestas).sort()).toEqual([
        '200',
        '401',
        '403',
        '404',
        '503',
      ]);
    });

    it('responde el perfil del agricultor (ProfileDto)', async () => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths['/profile/me'].get.responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/ProfileDto',
      });
    });

    it('todas las respuestas tienen una descripción', async () => {
      const documento = await obtenerDocumento();
      const descripciones = Object.values(
        documento.paths['/profile/me'].get.responses,
      ).map((respuesta: { description: string }) => respuesta.description);

      expect(descripciones).not.toContain('');
    });
  });

  describe('ProfileDto', () => {
    it('agrupa los datos del usuario y las ventas', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.ProfileDto;

      expect(esquema.required).toEqual(['user', 'sales']);
      expect(esquema.properties.user).toEqual({
        $ref: '#/components/schemas/UserSummaryDto',
      });
      expect(esquema.properties.sales).toEqual({
        $ref: '#/components/schemas/SalesPeriodsDto',
      });
    });

    it('resume las ventas de la semana y del mes', async () => {
      const esquema = (await obtenerDocumento()).components.schemas
        .SalesPeriodsDto;

      expect(esquema.required).toEqual(['week', 'month']);
      expect(esquema.properties.week).toEqual({
        $ref: '#/components/schemas/SalesSummaryDto',
      });
      expect(esquema.properties.month).toEqual({
        $ref: '#/components/schemas/SalesSummaryDto',
      });
    });

    it('cada resumen de ventas tiene total y cantidad', async () => {
      const esquema = (await obtenerDocumento()).components.schemas
        .SalesSummaryDto;

      expect(esquema.required).toEqual(['total', 'count']);
    });

    it('documenta los datos públicos del usuario', async () => {
      const esquema = (await obtenerDocumento()).components.schemas
        .UserSummaryDto;

      expect(Object.keys(esquema.properties)).toEqual([
        'userId',
        'name',
        'email',
        'documentType',
        'documentNumber',
        'phone',
        'address',
        'municipality',
        'role',
      ]);
    });
  });
});
