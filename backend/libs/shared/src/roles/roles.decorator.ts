import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';

export const ROLES_KEY = 'roles';

// Roles que puede tener el usuario autenticado para usar la ruta. Se usa junto con
// @UseGuards(JwtAuthGuard, RolesGuard): primero se valida el token y luego el rol
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
