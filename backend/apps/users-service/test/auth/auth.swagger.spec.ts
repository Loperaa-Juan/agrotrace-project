import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { setupSwagger } from '../../src/swagger';
import { DocumentType, UserRole } from '../../src/entities/user.entity';

// Prueba la documentación Swagger de /auth (sin BD: el servicio es falso)
describe('Documentación Swagger de /auth', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: {} }],
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

  describe('rutas', () => {
    const rutas = ['register', 'login', 'refresh', 'logout'];

    it.each(rutas)('/auth/%s post tiene un resumen', async (ruta) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[`/auth/${ruta}`].post.summary).toEqual(
        expect.any(String),
      );
    });

    it.each(rutas)('/auth/%s post es pública (no pide token)', async (ruta) => {
      const documento = await obtenerDocumento();

      expect(documento.paths[`/auth/${ruta}`].post.security).toBeUndefined();
    });

    it.each([
      ['register', ['201', '400', '409']],
      ['login', ['200', '400', '401']],
      ['refresh', ['200', '400', '401']],
      ['logout', ['200', '400', '401']],
    ])('/auth/%s post documenta las respuestas %j', async (ruta, codigos) => {
      const documento = await obtenerDocumento();
      const respuestas = documento.paths[`/auth/${ruta}`].post.responses;

      expect(Object.keys(respuestas).sort()).toEqual(codigos);
    });

    it.each([
      ['register', '201'],
      ['login', '200'],
      ['refresh', '200'],
    ])('/auth/%s post responde AuthResponseDto', async (ruta, codigo) => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths[`/auth/${ruta}`].post.responses[codigo];

      expect(respuesta.content['application/json'].schema).toEqual({
        $ref: '#/components/schemas/AuthResponseDto',
      });
    });

    it('/auth/logout post responde un mensaje de confirmación', async () => {
      const documento = await obtenerDocumento();
      const respuesta = documento.paths['/auth/logout'].post.responses['200'];

      expect(
        respuesta.content['application/json'].schema.properties.message.type,
      ).toBe('string');
    });

    it.each([
      ['register', 'RegisterDTO'],
      ['login', 'LoginDTO'],
      ['refresh', 'RefreshDTO'],
      ['logout', 'RefreshDTO'],
    ])('/auth/%s post recibe %s en el cuerpo', async (ruta, esquema) => {
      const documento = await obtenerDocumento();
      const cuerpo = documento.paths[`/auth/${ruta}`].post.requestBody;

      expect(cuerpo.content['application/json'].schema).toEqual({
        $ref: `#/components/schemas/${esquema}`,
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

  describe('RegisterDTO', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.RegisterDTO;

    it('marca todos los campos como obligatorios', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.required).toEqual([
        'name',
        'documentType',
        'documentNumber',
        'email',
        'phone',
        'password',
        'address',
        'municipality',
        'role',
      ]);
    });

    it('limita el nombre a 100 caracteres y la dirección a 255', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.name.maxLength).toBe(100);
      expect(esquema.properties.address.maxLength).toBe(255);
    });

    it('lista los tipos de documento permitidos', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.documentType.enum).toEqual(
        Object.values(DocumentType),
      );
    });

    it('documenta el correo con formato email', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.email.format).toBe('email');
    });

    it('exige entre 8 y 72 caracteres en la contraseña', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.password.minLength).toBe(8);
      expect(esquema.properties.password.maxLength).toBe(72);
    });

    it('solo permite el municipio Envigado', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.municipality.enum).toEqual(['Envigado']);
    });

    it('lista los roles de registro sin Admin', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.role.enum).toEqual([
        UserRole.AGRICULTOR,
        UserRole.PERSONA,
        UserRole.NEGOCIO,
      ]);
    });
  });

  describe('LoginDTO', () => {
    const obtenerEsquema = async () =>
      (await obtenerDocumento()).components.schemas.LoginDTO;

    it('marca correo y contraseña como obligatorios', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.required).toEqual(['email', 'password']);
    });

    it('documenta el correo con formato email y la contraseña con mínimo 6', async () => {
      const esquema = await obtenerEsquema();

      expect(esquema.properties.email.format).toBe('email');
      expect(esquema.properties.password.minLength).toBe(6);
    });
  });

  describe('RefreshDTO', () => {
    it('marca el refreshToken como obligatorio', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.RefreshDTO;

      expect(esquema.required).toEqual(['refreshToken']);
    });
  });

  describe('AuthResponseDto', () => {
    it('documenta los tokens y el usuario público', async () => {
      const esquema = (await obtenerDocumento()).components.schemas
        .AuthResponseDto;

      expect(esquema.required).toEqual(['accessToken', 'refreshToken', 'user']);
      expect(esquema.properties.user).toEqual({
        $ref: '#/components/schemas/AuthUserDto',
      });
    });
  });

  describe('AuthUserDto', () => {
    it('documenta solo los campos públicos (sin contraseña)', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.AuthUserDto;

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

    it('lista todos los roles, incluido Admin', async () => {
      const esquema = (await obtenerDocumento()).components.schemas.AuthUserDto;

      expect(esquema.properties.role.enum).toEqual(Object.values(UserRole));
    });
  });
});
