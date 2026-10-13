import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { RegisterDTO } from '../../src/auth/dto/register.dto';
import { AuthResponseDto } from '../../src/auth/dto/auth-response.dto';
import { DocumentType, UserRole } from '../../src/entities/user.entity';
import request from 'supertest';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: {} }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('Tests en las rutas /users', () => {
  let app: INestApplication;

  // Definimos los mocks de los servicios del usuario
  const usersService = {
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    logout: jest.fn(),
    validateRefreshToken: jest.fn(),
    validateAccessToken: jest.fn(),
  };

  // Sujeto de pruebas con los campos necesarios para el registro
  const usuarioRegistro: RegisterDTO = {
    name: 'Juan Pérez',
    documentType: DocumentType.CC,
    documentNumber: '1020304050',
    email: 'juan@agrotrace.com',
    phone: '3001234567',
    password: 'Segura123',
    address: 'Calle 10 # 20-30',
    municipality: 'Envigado',
    role: UserRole.AGRICULTOR,
  };

  // Respuesta que retorna el service al registrar (tokens + datos públicos, sin contraseña)
  const respuestaRegistro: AuthResponseDto = {
    accessToken: 'access-token-de-prueba',
    refreshToken: 'refresh-token-de-prueba',
    user: {
      userId: '7f3c2a1e-9b4d-4e6f-8a2b-1c3d5e7f9a0b',
      name: usuarioRegistro.name,
      email: usuarioRegistro.email,
      documentType: usuarioRegistro.documentType,
      documentNumber: usuarioRegistro.documentNumber,
      phone: usuarioRegistro.phone,
      address: usuarioRegistro.address,
      municipality: usuarioRegistro.municipality,
      role: usuarioRegistro.role,
    },
  };

  // Regla que se ejecuta antes de correr los tests
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: usersService }],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  // Regla para que después de los tests se baje la app y se limpie el estado de los mocks
  afterAll(() => app.close());
  beforeEach(() => jest.clearAllMocks());

  it('Se debe implementar un endpoint para registrar un usuario', async () => {
    usersService.registerUser.mockResolvedValue(respuestaRegistro);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(usuarioRegistro);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(respuestaRegistro);
    expect(usersService.registerUser).toHaveBeenCalledTimes(1);
    expect(usersService.registerUser).toHaveBeenCalledWith(usuarioRegistro);
  });

  it('Se debe implementar un endpoint para el inicio de sesión (Login)', async () => {
    const login = {
      email: usuarioRegistro.email,
      password: usuarioRegistro.password,
    };
    usersService.loginUser.mockResolvedValue(respuestaRegistro);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(login);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(respuestaRegistro);
    expect(usersService.loginUser).toHaveBeenCalledTimes(1);
    expect(usersService.loginUser).toHaveBeenCalledWith(login);
  });

  it('Se debe validar el Refresh Token mediante un endpoint', async () => {
    const refreshToken = {
      refreshToken: respuestaRegistro.refreshToken,
    };
    usersService.validateRefreshToken.mockResolvedValue(respuestaRegistro);

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send(refreshToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(respuestaRegistro);
    expect(usersService.validateRefreshToken).toHaveBeenCalledTimes(1);
    expect(usersService.validateRefreshToken).toHaveBeenCalledWith(
      refreshToken.refreshToken,
    );
  });

  it('Se debe hacer el logout del usuario mediante un endpoint', async () => {
    const logoutRequest = {
      refreshToken: respuestaRegistro.refreshToken,
    };

    const messageLogout = {
      message: 'Logged out successfully',
    };
    usersService.logout.mockResolvedValue(messageLogout);

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .send(logoutRequest);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(messageLogout);
    expect(usersService.logout).toHaveBeenCalledTimes(1);
    expect(usersService.logout).toHaveBeenCalledWith(
      logoutRequest.refreshToken,
    );
  });
});
