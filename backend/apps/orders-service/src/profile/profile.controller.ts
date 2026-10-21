import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { Profile, ProfileService } from './profile.service';

/**
 * Controlador encargado de exponer el perfil del agricultor,
 * incluyendo su información personal y las estadísticas de ventas semanales y mensuales.
 * Nota: El ID del agricultor se obtiene de forma segura directamente del token (request.user).
 */
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Endpoint protegido para que el agricultor consulte su propio perfil y resumen de ventas.
   * @param {any} request - Objeto de petición HTTP con los datos decodificados del token de sesión.
   * @returns {Promise<Profile>} Objeto con los datos del usuario y el resumen de ventas.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async getMine(@Req() request): Promise<Profile> {
    return await this.profileService.getProfile(request.user.sub);
  }
}
