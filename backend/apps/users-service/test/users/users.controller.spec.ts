import { NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersController } from '../../src/users/users.controller';
import { JwtAuthGuard } from '@app/shared';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: any;

  // Usuario de prueba tal como lo retorna el servicio (sin contraseña)
  const user = {
    userId: 'uuid-123',
    name: 'Juan',
    email: 'juan@agrotrace.com',
  };

  beforeEach(() => {
    usersService = {
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      userExists: jest.fn(),
      deleteUser: jest.fn(),
    };

    controller = new UsersController(usersService);
  });

  describe('getMe', () => {
    it('Debe retornar el usuario autenticado', async () => {
      usersService.getUserById.mockResolvedValue(user);
      const request: any = { user: { sub: 'uuid-123' } };

      const result = await controller.getMe(request);

      expect(usersService.getUserById).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(user);
    });

    it('Debe lanzar NotFoundException si el usuario no existe', async () => {
      usersService.getUserById.mockResolvedValue(null);
      const request: any = { user: { sub: 'no-existe' } };

      await expect(controller.getMe(request)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllUsers', () => {
    it('Debe retornar los usuarios con la paginación recibida', async () => {
      const paginated = {
        data: [user],
        meta: { total: 1, page: 2, limit: 5, totalPages: 1 },
      };
      usersService.getUsers.mockResolvedValue(paginated);

      const result = await controller.getAllUsers({ page: 2, limit: 5 });

      expect(usersService.getUsers).toHaveBeenCalledWith(2, 5);
      expect(result).toEqual(paginated);
    });

    it('Debe usar page 1 y limit 10 por defecto', async () => {
      usersService.getUsers.mockResolvedValue({ data: [], meta: {} });

      await controller.getAllUsers({});

      expect(usersService.getUsers).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('getUserById', () => {
    it('Debe retornar el usuario por su id', async () => {
      usersService.getUserById.mockResolvedValue(user);

      const result = await controller.getUserById({ userId: 'uuid-123' });

      expect(usersService.getUserById).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(user);
    });

    it('Debe retornar null si el usuario no existe', async () => {
      usersService.getUserById.mockResolvedValue(null);

      expect(await controller.getUserById({ userId: 'no-existe' })).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('Debe retornar el usuario actual', async () => {
      usersService.getUserById.mockResolvedValue(user);

      const result = await controller.getCurrentUser({ userId: 'uuid-123' });

      expect(usersService.getUserById).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(user);
    });
  });

  describe('userExists', () => {
    it('Debe retornar true si el usuario existe', async () => {
      usersService.userExists.mockResolvedValue(true);

      const result = await controller.userExists('uuid-123');

      expect(usersService.userExists).toHaveBeenCalledWith('uuid-123');
      expect(result).toBe(true);
    });

    it('Debe retornar false si el usuario no existe', async () => {
      usersService.userExists.mockResolvedValue(false);

      expect(await controller.userExists('no-existe')).toBe(false);
    });
  });

  describe('deleteMe', () => {
    it('Debe eliminar la cuenta del usuario autenticado', async () => {
      const request: any = { user: { sub: 'uuid-123' } };

      await controller.deleteMe(request);

      expect(usersService.deleteUser).toHaveBeenCalledWith('uuid-123');
    });
  });

  // Las rutas /users/me necesitan un usuario autenticado en request.user
  describe('rutas protegidas', () => {
    it('getMe debe estar protegido con JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        UsersController.prototype.getMe,
      );

      expect(guards).toContain(JwtAuthGuard);
    });

    it('deleteMe debe estar protegido con JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        UsersController.prototype.deleteMe,
      );

      expect(guards).toContain(JwtAuthGuard);
    });
  });
});
