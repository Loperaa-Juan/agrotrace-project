import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ValidationService } from '../../src/services/validation.service';

describe('ValidationService', () => {
  let service: ValidationService;
  const usersClient = { send: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        { provide: 'USERS_SERVICE', useValue: usersClient },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('validateUserExists', () => {
    it('envía user_exists a users-service con el userId', async () => {
      usersClient.send.mockReturnValue(of(true));

      await service.validateUserExists('user-1');

      expect(usersClient.send).toHaveBeenCalledWith('user_exists', 'user-1');
    });

    it('no lanza error si el usuario existe', async () => {
      usersClient.send.mockReturnValue(of(true));

      await expect(
        service.validateUserExists('user-1'),
      ).resolves.toBeUndefined();
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      usersClient.send.mockReturnValue(of(false));

      await expect(service.validateUserExists('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza ServiceUnavailableException si users-service no responde', async () => {
      usersClient.send.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED')),
      );

      await expect(service.validateUserExists('user-1')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('lanza BadRequestException si el userId está vacío', async () => {
      await expect(service.validateUserExists('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('no consulta a users-service si el userId está vacío', async () => {
      await service.validateUserExists('').catch(() => undefined);

      expect(usersClient.send).not.toHaveBeenCalled();
    });
  });
});
