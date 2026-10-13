import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../../src/guards/roles.guard';
import { Role } from '../../src/roles/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: any;

  // Simula el contexto de Nest para una petición de un usuario con el rol recibido
  // (JwtAuthGuard se ejecuta antes y deja el payload del token en request.user)
  const contextoCon = (role: Role) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    // Devuelve los roles que exige la ruta (@Roles)
    reflector = { getAllAndOverride: jest.fn() };

    guard = new RolesGuard(reflector);
  });

  it('Debe permitir el acceso si la ruta no exige roles', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue(undefined);

    // Act
    const result = guard.canActivate(contextoCon(Role.PERSONA));

    // Assert
    expect(result).toBe(true);
  });

  it('Debe permitir el acceso si el usuario tiene uno de los roles exigidos', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue([Role.AGRICULTOR]);

    // Act
    const result = guard.canActivate(contextoCon(Role.AGRICULTOR));

    // Assert
    expect(result).toBe(true);
  });

  it('Debe lanzar ForbiddenException si el usuario no tiene el rol exigido', () => {
    // Arrange
    reflector.getAllAndOverride.mockReturnValue([Role.AGRICULTOR]);

    // Act
    const action = () => guard.canActivate(contextoCon(Role.PERSONA));

    // Assert
    expect(action).toThrow(ForbiddenException);
  });
});
