import { UsersService } from '../../src/users/users.service';
import { DocumentType, UserRole } from '../../src/entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;

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
    password: 'hash-de-la-contraseña',
  };

  beforeEach(() => {
    userRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
    };

    service = new UsersService(userRepository);
  });

  describe('getUsers', () => {
    it('Debe retornar los usuarios paginados sin la contraseña', async () => {
      userRepository.findAndCount.mockResolvedValue([[user], 1]);

      const result = await service.getUsers();

      expect(result.data[0].email).toBe('juan@agrotrace.com');
      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('Debe calcular el skip según la página', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.getUsers(3, 10);

      expect(userRepository.findAndCount).toHaveBeenCalledWith({
        skip: 20,
        take: 10,
        order: { createdAt: 'DESC' },
      });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('getUserById', () => {
    it('Debe retornar el usuario si existe', async () => {
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.getUserById('uuid-123');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'uuid-123' },
      });
      expect(result?.userId).toBe('uuid-123');
      expect(result).not.toHaveProperty('password');
    });

    it('Debe retornar null si el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserById('no-existe');

      expect(result).toBeNull();
    });
  });

  describe('userExists', () => {
    it('Debe retornar true si el usuario existe', async () => {
      userRepository.exists.mockResolvedValue(true);

      const result = await service.userExists('uuid-123');

      expect(userRepository.exists).toHaveBeenCalledWith({
        where: { userId: 'uuid-123' },
      });
      expect(result).toBe(true);
    });

    it('Debe retornar false si el usuario no existe', async () => {
      userRepository.exists.mockResolvedValue(false);

      expect(await service.userExists('no-existe')).toBe(false);
    });
  });
});
