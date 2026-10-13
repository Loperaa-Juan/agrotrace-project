import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard, RolesGuard } from '@app/shared';
import { CatalogController } from '../../src/catalog/catalog.controller';
import { CatalogService } from '../../src/catalog/catalog.service';

// Prueba las rutas por HTTP para que se ejecuten los pipes de Nest (sin BD: el servicio es falso).
// Los guards se reemplazan para que dejen pasar: el token y el rol se prueban en sus propios tests
describe('Rutas de /catalog/:id', () => {
  let app: INestApplication;

  const idValido = '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        {
          provide: CatalogService,
          useValue: {
            findOne: jest.fn((id) => Promise.resolve({ ProductId: id })),
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

  it('GET acepta un id con formato UUID', async () => {
    const response = await request(app.getHttpServer()).get(
      `/catalog/${idValido}`,
    );

    expect(response.status).toBe(200);
  });

  it('GET responde 400 si el id no es un UUID', async () => {
    const response = await request(app.getHttpServer()).get('/catalog/abc');

    expect(response.status).toBe(400);
  });

  it('PATCH responde 400 si el id no es un UUID', async () => {
    const response = await request(app.getHttpServer())
      .patch('/catalog/abc')
      .send({ unitOfMeasure: 'kg' });

    expect(response.status).toBe(400);
  });

  it('DELETE responde 400 si el id no es un UUID', async () => {
    const response = await request(app.getHttpServer()).delete('/catalog/abc');

    expect(response.status).toBe(400);
  });
});
