import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard, Role, ROLES_KEY, RolesGuard } from '@app/shared';
import { ProfileController } from '../../src/profile/profile.controller';

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: any;

  // Petición de un agricultor autenticado: el guard deja el payload del token en request.user
  const agricultor: any = { user: { sub: 'farmer-1', role: Role.AGRICULTOR } };

  beforeEach(() => {
    // El servicio falso responde con el id que recibe
    profileService = {
      getProfile: jest.fn((userId) =>
        Promise.resolve({ user: { userId }, sales: {} }),
      ),
    };

    controller = new ProfileController(profileService);
  });

  it('Debe devolver el perfil del agricultor autenticado', async () => {
    // Arrange
    const peticion = agricultor;

    // Act
    const result = await controller.getMine(peticion);

    // Assert
    expect(result).toEqual({ user: { userId: 'farmer-1' }, sales: {} });
  });

  it('Debe exigir token y el rol Agricultor', () => {
    // Arrange
    const handler = ProfileController.prototype.getMine;

    // Act
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    const roles = Reflect.getMetadata(ROLES_KEY, handler);

    // Assert
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(roles).toEqual([Role.AGRICULTOR]);
  });
});
