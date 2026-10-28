import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { OrdersController } from '../../src/orders/orders.controller';
import { OrdersService } from '../../src/orders/orders.service';
import { setupSwagger } from '../../src/swagger';
import { OrderStatus } from '../../src/entities/order.entity';

// Prueba la documentación Swagger de /orders (sin BD: el servicio es falso).
// Los guards se reemplazan porque aquí solo importa la documentación, no la autenticación
describe('Documentación Swagger de /orders', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: {} }],
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
    const rutas = [
      ['/orders', 'post'],
      ['/orders/me', 'get'],
      ['/orders/received', 'get'],
      ['/orders/{id}/deliver', 'patch'],
      ['/orders/{id}/status', 'patch'],
    ];

    it.each(rutas)('%s %s tiene un resumen', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].summary).toEqual(expect.any(String));
    });

    it.each(rutas)('%s %s pide token Bearer', async (ruta, metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[ruta][metodo].security).toEqual([{ bearer: [] }]);
    });

    it.each(['deliver', 'status'])(
      '/orders/{id}/%s documenta el id como UUID',
      async (accion) => {
        const documento = await obtenerDocumento();
        const parametroId = documento.paths[
          `/orders/{id}/${accion}`
        ].patch.parameters.find((parametro) => parametro.name === 'id');

        expect(parametroId.schema.format).toBe('uuid');
      },
    );

    it.each([
      ['/orders', 'post', ['201', '400', '401', '403', '404', '503']],
      ['/orders/me', 'get', ['200', '401', '403']],
      ['/orders/received', 'get', ['200', '401', '403']],
      ['/orders/{id}/deliver', 'patch', ['200', '400', '401', '403', '404']],
      [
        '/orders/{id}/status',
        'patch',
        ['200', '400', '401', '403', '404', '503'],
      ],
    ])('%s %s documenta las respuestas %j', async (ruta, metodo, codigos) => {
      const documento = await obtenerDocumento();
      const respuestas = documento.paths[ruta][metodo].responses;

      expect(Object.keys(respuestas).sort()).toEqual(codigos);
    });

    it('/orders post responde la orden creada', async () => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths['/orders'].post.responses['201'];

      expect(respuesta.content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/Order',
      });
    });

    it('/orders/me get responde una lista de órdenes', async () => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths['/orders/me'].get.responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        type: 'array',
        items: { $ref: '#/components/schemas/Order' },
      });
    });

    it('/orders/received get responde una lista de órdenes sin código de entrega', async () => {
      const documento = await obtenerDocumento();
      const respuesta =
        documento.paths['/orders/received'].get.responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        type: 'array',
        items: { $ref: '#/components/schemas/FarmerOrderDto' },
      });
    });

    it('/orders/{id}/deliver patch responde la orden sin código de entrega', async () => {
      const documento = await obtenerDocumento();
      const respuesta =
        documento.paths['/orders/{id}/deliver'].patch.responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/FarmerOrderDto',
      });
    });

    it('/orders/{id}/status patch responde la orden completa o sin código de entrega', async () => {
      const documento = await obtenerDocumento();
      const respuesta =
        documento.paths['/orders/{id}/status'].patch.responses['200'];

      expect(respuesta.content['application/json'].schema).toEqual({
        oneOf: [
          { $ref: '#/components/schemas/Order' },
          { $ref: '#/components/schemas/FarmerOrderDto' },
        ],
      });
    });

    it('/orders/{id}/deliver patch recibe el código de entrega de 6 dígitos', async () => {
      const documento = await obtenerDocumento();
      const cuerpo =
        documento.paths['/orders/{id}/deliver'].patch.requestBody.content[
          'application/json'
        ].schema;

      expect(cuerpo.required).toEqual(['deliveryCode']);
      expect(cuerpo.properties.deliveryCode).toMatchObject({
        type: 'string',
        minLength: 6,
        maxLength: 6,
      });
    });

    it('/orders post y /orders/{id}/status patch reciben su DTO en el cuerpo', async () => {
      const documento = await obtenerDocumento();

      expect(
        documento.paths['/orders'].post.requestBody.content['application/json']
          .schema,
      ).toEqual({ $ref: '#/components/schemas/CreateOrderDto' });
      expect(
        documento.paths['/orders/{id}/status'].patch.requestBody.content[
          'application/json'
        ].schema,
      ).toEqual({ $ref: '#/components/schemas/UpdateOrderStatusDto' });
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

  describe('CreateOrderDto', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.CreateOrderDto;

    it('marca la oferta y la cantidad como obligatorias', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.required).toEqual(['offertId', 'quantity']);
    });

    it('documenta la oferta como UUID', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.offertId.format).toBe('uuid');
    });

    it('exige una cantidad mayor a 0', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.quantity).toMatchObject({
        type: 'number',
        minimum: 0,
        exclusiveMinimum: true,
      });
    });
  });

  describe('UpdateOrderStatusDto', () => {
    it('lista solo los estados que se pueden cambiar a mano', async () => {
      const esquema = (await obtenerDocumento()).components.schemas
        .UpdateOrderStatusDto;

      expect(esquema.required).toEqual(['status']);
      expect(esquema.properties.status.enum).toEqual([
        OrderStatus.ACEPTADO,
        OrderStatus.RECHAZADO,
        OrderStatus.CANCELADO,
      ]);
    });
  });

  describe('Order', () => {
    const camposDeOrder = [
      'OrderId',
      'buyerId',
      'buyer',
      'offertId',
      'farmerId',
      'farmer',
      'quantity',
      'unitPrice',
      'totalPrice',
      'status',
      'deliveryCode',
      'createdAt',
      'updatedAt',
    ];

    it('documenta todos los campos de la orden', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.Order;

      expect(Object.keys(esquema.properties)).toEqual(camposDeOrder);
    });

    it('lista los estados posibles de la orden', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.Order;

      expect(esquema.properties.status.enum).toEqual(
        Object.values(OrderStatus),
      );
    });

    it('documenta los datos de contacto del comprador y el agricultor', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.Order;

      for (const campo of ['buyer', 'farmer']) {
        expect(esquema.properties[campo].nullable).toBe(true);
        expect(Object.keys(esquema.properties[campo].properties)).toEqual([
          'userId',
          'name',
          'phone',
          'municipality',
        ]);
      }
    });

    it('FarmerOrderDto tiene los mismos campos salvo el código de entrega', async () => {
      const esquema = (await obtenerDocumento()).components.schemas
        .FarmerOrderDto;

      expect(Object.keys(esquema.properties)).toEqual(
        camposDeOrder.filter((campo) => campo !== 'deliveryCode'),
      );
    });
  });
});
