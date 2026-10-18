import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

/**
 * Clave de metadata donde {@link Roles} guarda los roles permitidos de la ruta.
 * @type {string}
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador que define los roles que puede tener el usuario autenticado para usar la ruta.
 * Se usa junto con `@UseGuards(JwtAuthGuard, RolesGuard)`: primero se valida el token y luego el rol.
 * @function Roles
 * @param {...Role} roles Roles permitidos para la ruta o el controlador.
 * @returns {CustomDecorator<string>} Decorador que guarda los roles en la metadata {@link ROLES_KEY}.
 * @example
 * // En un controlador:
 * // @Roles(Role.AGRICULTOR, Role.ADMIN)
 * // @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
