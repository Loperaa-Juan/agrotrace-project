import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../../src/auth/auth.service';
import { DocumentType, UserRole } from '../../src/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;
  let refreshTokenRepository: any;
  let jwtService: any;

  // Usuario de prueba que simula lo que hay en la BD
  const user = {
    userId: 'uuid-123',
    name: 'Juan',
    email: 'juan@agrotrace.com',
    phone: '3001234567',
    role: UserRole.AGRICULTOR,
    documentType: DocumentType.CC,
    documentNumber: '1234567890',
    address: 'Calle 1 # 2-3',
    municipality: 'Rionegro',
    password: '',
  };

  const registerData = {
    name: 'Juan',
    email: 'juan@agrotrace.com',
    phone: '3001234567',
    role: UserRole.AGRICULTOR,
    documentType: DocumentType.CC,
    documentNumber: '1234567890',
    address: 'Calle 1 # 2-3',
    municipality: 'Rionegro',
    password: 'segura123',
  };

  beforeEach(async () => {
    user.password = await bcrypt.hash('segura123', 10);

    // Mocks sencillos de los repositorios y del JwtService
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
    };

    refreshTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('access-token'),
      verify: jest.fn(),
    };

    service = new AuthService(
      userRepository,
      refreshTokenRepository,
      jwtService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Tests sobre el refresh token', () => {
    it('Se debe generar el refresh token en un formato hexadecimal', () => {
      const token = service['generateRefreshToken']();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('Se deben generar tokens distintos cada vez', () => {
      const token1 = service['generateRefreshToken']();
      const token2 = service['generateRefreshToken']();
      expect(token1).not.toBe(token2);
    });

    it('El hash del refresh token debe ser siempre el mismo para el mismo token', () => {
      const hash1 = service['hashRefreshToken']('mi-token');
      const hash2 = service['hashRefreshToken']('mi-token');
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe('mi-token');
    });
  });

  describe('registerUser', () => {
    it('Debe registrar un usuario nuevo y devolver los tokens', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.registerUser(registerData);

      expect(userRepository.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(registerData.email);
    });

    it('Debe guardar la contraseña hasheada y no en texto plano', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await service.registerUser(registerData);

      const savedUser = userRepository.create.mock.calls[0][0];
      expect(savedUser.password).not.toBe('segura123');
      expect(await bcrypt.compare('segura123', savedUser.password)).toBe(true);
    });

    it('No debe devolver la contraseña en la respuesta', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.registerUser(registerData);

      expect(result.user).not.toHaveProperty('password');
    });

    it('Debe lanzar ConflictException si el email ya existe', async () => {
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.registerUser(registerData)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('loginUser', () => {
    it('Debe hacer login con email y contraseña correctos', async () => {
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.loginUser({
        email: 'juan@agrotrace.com',
        password: 'segura123',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user.userId).toBe(user.userId);
    });

    it('Debe lanzar UnauthorizedException si el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.loginUser({
          email: 'noexiste@agrotrace.com',
          password: 'segura123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('Debe lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      userRepository.findOne.mockResolvedValue(user);

      await expect(
        service.loginUser({
          email: 'juan@agrotrace.com',
          password: 'incorrecta',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('Debe revocar el refresh token y devolver un mensaje', async () => {
      const storedToken = { id: 1, token: 'hash', isRevoked: false };
      refreshTokenRepository.findOne.mockResolvedValue(storedToken);

      const result = await service.logout('mi-token');

      expect(storedToken.isRevoked).toBe(true);
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('Debe lanzar UnauthorizedException si el token no existe', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.logout('token-falso')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('Debe devolver nuevos tokens si el refresh token es válido', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: user.userId,
      });
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.validateRefreshToken('mi-token');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).not.toBe('mi-token');
    });

    it('Debe revocar el refresh token usado', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: user.userId,
      });
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });
      userRepository.findOne.mockResolvedValue(user);

      await service.validateRefreshToken('mi-token');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { id: 1, isRevoked: false },
        { isRevoked: true },
      );
    });

    it('Debe lanzar UnauthorizedException si el token no existe o expiró', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.validateRefreshToken('token-falso')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Debe lanzar UnauthorizedException si el token ya fue usado por otra petición', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: user.userId,
      });
      refreshTokenRepository.update.mockResolvedValue({ affected: 0 });

      await expect(service.validateRefreshToken('mi-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Debe lanzar UnauthorizedException si el usuario del token no existe', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 1,
        userId: 'otro-id',
      });
      refreshTokenRepository.update.mockResolvedValue({ affected: 1 });
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.validateRefreshToken('mi-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateAccessToken', () => {
    it('Debe devolver el payload si el access token es válido', async () => {
      const payload = { sub: user.userId, email: user.email, role: user.role };
      jwtService.verify.mockReturnValue(payload);

      const result = await service.validateAccessToken('access-token');

      expect(result).toEqual(payload);
    });

    it('Debe lanzar error si el access token es inválido', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        service.validateAccessToken('token-falso'),
      ).rejects.toThrow();
    });
  });
});
