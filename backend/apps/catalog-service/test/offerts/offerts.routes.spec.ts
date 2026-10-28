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
            create: jest.fn().mockResolvedValue({}),
            findAll: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        // Deja pasar y simula el payload del token que el guard real pone en request.user
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = { sub: 'farmer-1' };
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /offerts responde 400 si no se envía la foto de la fruta', async () => {
    // Arrange
    const ruta = '/offerts';

    // Act
    const response = await request(app.getHttpServer())
      .post(ruta)
      .field('productId', '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f');

    // Assert
    expect(response.status).toBe(400);
  });

  it('POST /offerts responde 400 si el archivo no es una imagen', async () => {
    // Arrange
    const ruta = '/offerts';

    // Act
    const response = await request(app.getHttpServer())
      .post(ruta)
      .attach('image', Buffer.from('hola'), {
        filename: 'nota.txt',
        contentType: 'text/plain',
      });

    // Assert
    expect(response.status).toBe(400);
  });

  it('POST /offerts responde 201 si se envía una imagen', async () => {
    // Arrange
    const ruta = '/offerts';

    // Act
    const response = await request(app.getHttpServer())
      .post(ruta)
      .field('productId', '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f')
      .field('pricePerUnit', '3500')
      .field('availableQuantity', '120')
      .attach('image', Buffer.from('foto'), {
        filename: 'tomate.jpg',
        contentType: 'image/jpeg',
      });

    // Assert
    expect(response.status).toBe(201);
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
