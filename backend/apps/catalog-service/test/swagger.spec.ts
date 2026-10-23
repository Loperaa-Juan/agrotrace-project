import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { CatalogController } from '../src/catalog/catalog.controller';
import { CatalogService } from '../src/catalog/catalog.service';
import { setupSwagger } from '../src/swagger';
import {
  ProductCategory,
  UnitOfMeasure,
} from '../src/entities/product.entitie';

// Prueba el documento OpenAPI que genera Swagger (sin BD: el servicio es falso).
// Los guards se reemplazan porque aquí solo importa la documentación, no la autenticación
describe('Documentación Swagger de catalog-service', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [{ provide: CatalogService, useValue: {} }],
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

  it('publica el documento OpenAPI en /docs-json', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json');

    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe('AgroTrace - catalog-service');
  });

  describe('rutas de /catalog', () => {
    it.each([
      ['/catalog', 'post'],
      ['/catalog', 'get'],
      ['/catalog/{id}', 'get'],
      ['/catalog/{id}', 'patch'],
      ['/catalog/{id}', 'delete'],
    ])('%s %s tiene un resumen', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].summary).toEqual(expect.any(String));
    });

    it.each([
      ['/catalog', 'post'],
      ['/catalog/{id}', 'patch'],
      ['/catalog/{id}', 'delete'],
    ])('%s %s pide token Bearer', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].security).toEqual([{ bearer: [] }]);
    });

    it.each([
      ['/catalog', 'get'],
      ['/catalog/{id}', 'get'],
    ])('%s %s es pública (no pide token)', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].security).toBeUndefined();
    });

    it.each(['get', 'patch', 'delete'])(
      '/catalog/{id} %s documenta el id como UUID',
      async (metodo) => {
        const documento = await obtenerDocumento();
        const parametroId = documento.paths['/catalog/{id}'][
          metodo
        ].parameters.find((parametro) => parametro.name === 'id');

        expect(parametroId.schema.format).toBe('uuid');
      },
    );

    it.each([
      ['/catalog', 'post', ['201', '400', '401', '403', '409']],
      ['/catalog', 'get', ['200']],
      ['/catalog/{id}', 'get', ['200', '400', '404']],
      ['/catalog/{id}', 'patch', ['200', '400', '401', '403', '404']],
      ['/catalog/{id}', 'delete', ['200', '400', '401', '403', '404']],
    ])('%s %s documenta las respuestas %j', async (ruta, metodo, codigos) => {
      const documento = await obtenerDocumento();
      const respuestas = documento.paths[ruta][metodo].responses;

      expect(Object.keys(respuestas).sort()).toEqual(codigos);
    });

    it('/catalog get responde una lista de productos', async () => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths['/catalog'].get.responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        type: 'array',
        items: { $ref: '#/components/schemas/Product' },
      });
    });

    it.each([
      ['/catalog', 'post', '201'],
      ['/catalog/{id}', 'get', '200'],
      ['/catalog/{id}', 'patch', '200'],
      ['/catalog/{id}', 'delete', '200'],
    ])('%s %s responde un producto', async (ruta, metodo, codigo) => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths[ruta][metodo].responses[codigo];

      expect(respuesta.content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/Product',
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

    it('define el esquema de seguridad Bearer con JWT', async () => {
      const documento = await obtenerDocumento();

      expect(documento.components.securitySchemes.bearer).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      });
    });
  });

  describe('CreateProductDto', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.CreateProductDto;

    it('marca todos los campos como obligatorios', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.required).toEqual([
        'name',
        'category',
        'unitOfMeasure',
        'description',
      ]);
    });

    it('limita el nombre a 100 caracteres', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.name.maxLength).toBe(100);
    });

    it('lista las categorías permitidas', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.category.enum).toEqual(
        Object.values(ProductCategory),
      );
    });

    it('lista las unidades de medida permitidas', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.unitOfMeasure.enum).toEqual(
        Object.values(UnitOfMeasure),
      );
    });
  });

  describe('Product', () => {
    it('documenta los campos que devuelve la API (sin las ofertas)', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.Product;

      expect(Object.keys(esquema.properties)).toEqual([
        'ProductId',
        'name',
        'category',
        'unitOfMeasure',
        'description',
        'isActive',
        'createdAt',
        'updatedAt',
      ]);
    });
  });

  describe('UpdateProductDto', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.UpdateProductDto;

    it('documenta los campos del producto como opcionales', async () => {
      const esquema = await obtenerEsquema();

      expect(Object.keys(esquema.properties)).toEqual([
        'name',
        'category',
        'unitOfMeasure',
        'description',
      ]);
      expect(esquema.required).toBeUndefined();
    });

    it('lista las categorías permitidas', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.category.enum).toEqual(
        Object.values(ProductCategory),
      );
    });

    it('lista las unidades de medida permitidas', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.unitOfMeasure.enum).toEqual(
        Object.values(UnitOfMeasure),
      );
    });
  });
});
