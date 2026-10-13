import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { OffertsController } from '../../src/offerts/offerts.controller';
import { OffertsService } from '../../src/offerts/offerts.service';

// Prueba las rutas por HTTP para que se ejecuten los pipes de Nest (sin BD: el servicio es falso).
// Los guards se reemplazan para que dejen pasar: el token y el rol se prueban en sus propios tests
describe('Rutas de /offerts con ids', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [OffertsController],
      providers: [
        {
          provide: OffertsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            remove: jest.fn(),
          },
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

  it('GET /offerts sin productId debe seguir funcionando', async () => {
    // Arrange
    const ruta = '/offerts';

    // Act
    const response = await request(app.getHttpServer()).get(ruta);

    // Assert
    expect(response.status).toBe(200);
  });

  it('GET /offerts responde 400 si el productId no es un UUID', async () => {
    // Arrange
    const ruta = '/offerts?productId=abc';

    // Act
    const response = await request(app.getHttpServer()).get(ruta);

    // Assert
    expect(response.status).toBe(400);
  });

  it('PATCH /offerts/:id responde 400 si el id no es un UUID', async () => {
    // Arrange
    const ruta = '/offerts/abc';

    // Act
    const response = await request(app.getHttpServer())
      .patch(ruta)
      .send({ pricePerUnit: 4000 });

    // Assert
    expect(response.status).toBe(400);
  });

  it('DELETE /offerts/:id responde 400 si el id no es un UUID', async () => {
    // Arrange
    const ruta = '/offerts/abc';

    // Act
    const response = await request(app.getHttpServer()).delete(ruta);

    // Assert
    expect(response.status).toBe(400);
  });
});
