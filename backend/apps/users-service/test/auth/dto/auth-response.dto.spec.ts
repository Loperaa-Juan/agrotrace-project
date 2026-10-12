import { toAuthUserDto } from '../../../src/auth/dto/auth-response.dto';
import {
  DocumentType,
  User,
  UserRole,
} from '../../../src/entities/user.entity';

describe('Auth Response DTO', () => {
  const user = {
    userId: 'uuid-123',
    name: 'Juan Pérez',
    documentType: DocumentType.CC,
    documentNumber: '0012345678',
    email: 'juan@test.com',
    phone: '3001234567',
    password: 'hashed-password',
    address: 'Calle 1 # 2-3',
    municipality: 'Medellín',
    role: UserRole.AGRICULTOR,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
  } as User;

  it('Debe devolver solo los datos públicos del usuario', () => {
    const dto = toAuthUserDto(user);

    expect(dto).toEqual({
      userId: 'uuid-123',
      name: 'Juan Pérez',
      email: 'juan@test.com',
      documentType: DocumentType.CC,
      documentNumber: '0012345678',
      phone: '3001234567',
      address: 'Calle 1 # 2-3',
      municipality: 'Medellín',
      role: UserRole.AGRICULTOR,
    });
  });

  it('No debe exponer la contraseña, los tokens ni las fechas', () => {
    const dto = toAuthUserDto(user);

    expect(dto).not.toHaveProperty('password');
    expect(dto).not.toHaveProperty('refreshTokens');
    expect(dto).not.toHaveProperty('createdAt');
    expect(dto).not.toHaveProperty('updatedAt');
  });
});
