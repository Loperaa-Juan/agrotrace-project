import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../roles/role.enum';
import { ROLES_KEY } from '../roles/roles.decorator';

/**
 * Guard que verifica que el rol del token (`request.user.role`) sea uno de los que exige
 * la ruta con {@link Roles}. Debe ejecutarse después de {@link JwtAuthGuard}.
 * @implements {CanActivate}
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * @param {Reflector} reflector Lee la metadata de roles definida en el handler o el controlador.
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * Compara el rol del usuario autenticado con los roles permitidos de la ruta.
   * Si la ruta no usa {@link Roles}, deja pasar la petición.
   * @param {ExecutionContext} context Contexto de ejecución de la petición actual.
   * @returns {boolean} `true` si la ruta no exige roles o el usuario tiene uno de ellos.
   * @throws {ForbiddenException} Si el rol del usuario no está entre los permitidos.
   */
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!roles.includes(user?.role)) {
      throw new ForbiddenException(
        'You do not have permission for this action',
      );
    }
    return true;
  }
}
