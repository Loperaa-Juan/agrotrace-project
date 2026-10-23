import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { OffertsController } from '../../src/offerts/offerts.controller';
import { OffertsService } from '../../src/offerts/offerts.service';
import { setupSwagger } from '../../src/swagger';
import { AiQuality } from '../../src/entities/offert.entity';

// Prueba la documentación Swagger de /offerts (sin BD: el servicio es falso).
// Los guards se reemplazan porque aquí solo importa la documentación, no la autenticación
describe('Documentación Swagger de /offerts', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [OffertsController],
      providers: [{ provide: OffertsService, useValue: {} }],
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

  describe('rutas', () => {
    it.each([
      ['/offerts', 'post'],
      ['/offerts', 'get'],
      ['/offerts/me', 'get'],
      ['/offerts/{id}', 'patch'],
      ['/offerts/{id}', 'delete'],
    ])('%s %s tiene un resumen', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].summary).toEqual(expect.any(String));
    });

    it.each([
      ['/offerts', 'post'],
      ['/offerts/me', 'get'],
      ['/offerts/{id}', 'patch'],
      ['/offerts/{id}', 'delete'],
    ])('%s %s pide token Bearer', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].security).toEqual([{ bearer: [] }]);
    });

    it('/offerts get es pública (no pide token)', async () => {
      const documento = await obtenerDocumento();

      expect(documento.paths['/offerts'].get.security).toBeUndefined();
    });

    it.each(['patch', 'delete'])(
      '/offerts/{id} %s documenta el id como UUID',
      async (metodo) => {
        const documento = await obtenerDocumento();
        const parametroId = documento.paths['/offerts/{id}'][
          metodo
        ].parameters.find((parametro) => parametro.name === 'id');

        expect(parametroId.schema.format).toBe('uuid');
      },
    );

    it('/offerts get documenta el filtro productId como UUID opcional', async () => {
      const documento = await obtenerDocumento();
      const filtro = documento.paths['/offerts'].get.parameters.find(
        (parametro) => parametro.name === 'productId',
      );

      expect(filtro).toMatchObject({
        in: 'query',
        required: false,
        schema: { format: 'uuid' },
      });
    });

    it.each([
      ['/offerts', 'post', ['201', '400', '401', '403', '404', '503']],
      ['/offerts', 'get', ['200', '400']],
      ['/offerts/me', 'get', ['200', '401', '403']],
      ['/offerts/{id}', 'patch', ['200', '400', '401', '403', '404']],
      ['/offerts/{id}', 'delete', ['200', '400', '401', '403', '404']],
    ])('%s %s documenta las respuestas %j', async (ruta, metodo, codigos) => {
      const documento = await obtenerDocumento();
      const respuestas = documento.paths[ruta][metodo].responses;

      expect(Object.keys(respuestas).sort()).toEqual(codigos);
    });

    it.each([
      ['/offerts', 'get'],
      ['/offerts/me', 'get'],
    ])('%s %s responde una lista de ofertas', async (ruta, metodo) => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths[ruta][metodo].responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        type: 'array',
        items: { $ref: '#/components/schemas/Offert' },
      });
    });

    it.each([
      ['/offerts', 'post', '201'],
      ['/offerts/{id}', 'patch', '200'],
      ['/offerts/{id}', 'delete', '200'],
    ])('%s %s responde una oferta', async (ruta, metodo, codigo) => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths[ruta][metodo].responses[codigo];

      expect(respuesta.content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/Offert',
      });
    });

    it('todas las respuestas tienen una descripción', async () => {
      const documento = await obtenerDocumento();
      const descripciones = Object.values(documento.paths).flatMap(
        (metodos: object) =>
          Object.values(metodos).flatMap((operacion) =>
            Object.values(operacion.responses).map(
              (respuesta: { description: string }) => respuesta.description,
            ),
          ),
      );

      expect(descripciones).not.toContain('');
    });
  });

  describe('Offert', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.Offert;

    it('documenta los campos que devuelve la API (sin el producto)', async () => {
      const esquema = await obtenerEsquema();

      expect(Object.keys(esquema.properties)).toEqual([
        'OffertId',
        'productId',
        'farmerId',
        'description',
        'pricePerUnit',
        'availableQuantity',
        'harvestDate',
        'aiQuality',
        'isActive',
        'createdAt',
        'updatedAt',
      ]);
    });

    it('documenta la calidad de la IA como opcional (null hasta clasificar)', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.aiQuality).toMatchObject({
        enum: Object.values(AiQuality),
        nullable: true,
      });
    });
  });

  describe('CreateOffertDto', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.CreateOffertDto;

    it('documenta los campos de la oferta', async () => {
      const esquema = await obtenerEsquema();

      expect(Object.keys(esquema.properties)).toEqual([
        'productId',
        'description',
        'pricePerUnit',
        'availableQuantity',
        'harvestDate',
      ]);
    });

    it('marca como obligatorios el producto, el precio y la cantidad', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.required).toEqual([
        'productId',
        'pricePerUnit',
        'availableQuantity',
      ]);
    });

    it('documenta el producto como UUID', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.productId.format).toBe('uuid');
    });

    it.each(['pricePerUnit', 'availableQuantity'])(
      'documenta que %s debe ser mayor a 0',
      async (campo) => {
        const esquema = await obtenerEsquema();

        expect(esquema.properties[campo]).toMatchObject({
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
        });
      },
    );

    it('documenta la fecha de cosecha con formato de fecha', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.harvestDate.format).toBe('date');
    });
  });

  describe('UpdateOffertDto', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.UpdateOffertDto;

    it('documenta los campos como opcionales y sin el producto', async () => {
      const esquema = await obtenerEsquema();

      expect(Object.keys(esquema.properties)).toEqual([
        'description',
        'pricePerUnit',
        'availableQuantity',
        'harvestDate',
      ]);
      expect(esquema.required).toBeUndefined();
    });

    it.each(['pricePerUnit', 'availableQuantity'])(
      'documenta que %s debe ser mayor a 0',
      async (campo) => {
        const esquema = await obtenerEsquema();

        expect(esquema.properties[campo]).toMatchObject({
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
        });
      },
    );

    it('documenta la fecha de cosecha con formato de fecha', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.harvestDate.format).toBe('date');
    });
  });
});
