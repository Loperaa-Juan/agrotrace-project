import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@app/shared';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { setupSwagger } from '../../src/swagger';

// Prueba la documentación Swagger de /users (sin BD: el servicio es falso).
// El guard se reemplaza porque aquí solo importa la documentación, no la autenticación
describe('Documentación Swagger de /users', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
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

  it('solo documenta las rutas HTTP (los patrones TCP no aparecen)', async () => {
    const documento = await obtenerDocumento();

    expect(Object.keys(documento.paths)).toEqual(['/users/me']);
  });

  it.each(['get', 'delete'])(
    '/users/me %s tiene un resumen',
    async (metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths['/users/me'][metodo].summary).toEqual(
        expect.any(String),
      );
    },
  );

  it.each(['get', 'delete'])(
    '/users/me %s pide token Bearer',
    async (metodo) => {
      const documento = await obtenerDocumento();

      expect(documento.paths['/users/me'][metodo].security).toEqual([
        { bearer: [] },
      ]);
    },
  );

  it.each([
    ['get', ['200', '401', '404']],
    ['delete', ['204', '401']],
  ])('/users/me %s documenta las respuestas %j', async (metodo, codigos) => {
    const documento = await obtenerDocumento();
    const respuestas = documento.paths['/users/me'][metodo].responses;

    expect(Object.keys(respuestas).sort()).toEqual(codigos);
  });

  it('/users/me get responde el usuario público (AuthUserDto)', async () => {
    const documento = await obtenerDocumento();
    const respuesta = documento.paths['/users/me'].get.responses['200'];

    expect(respuesta.content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/AuthUserDto',
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
