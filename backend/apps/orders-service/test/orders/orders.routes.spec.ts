import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { OrdersController } from '../../src/orders/orders.controller';
import { OrdersService } from '../../src/orders/orders.service';

// Prueba las rutas por HTTP para que se ejecuten los pipes de Nest (sin BD: el servicio es falso).
// Los guards se reemplazan para que dejen pasar: el token y el rol se prueban en sus propios tests
describe('Rutas de /orders/:id', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: { changeStatus: jest.fn(), deliver: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('PATCH /orders/:id/status responde 400 si el id no es un UUID', async () => {
    // Arrange
    const ruta = '/orders/abc/status';

    // Act
    const response = await request(app.getHttpServer())
      .patch(ruta)
      .send({ status: 'Aceptado' });

    // Assert
    expect(response.status).toBe(400);
  });

  it('PATCH /orders/:id/deliver responde 400 si el id no es un UUID', async () => {
    // Arrange
    const ruta = '/orders/abc/deliver';

    // Act
    const response = await request(app.getHttpServer())
      .patch(ruta)
      .send({ deliveryCode: '123456' });

    // Assert
    expect(response.status).toBe(400);
  });
});
