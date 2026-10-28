import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { Profile, ProfileService } from './profile.service';

/**
 * Controlador de perfil del agricultor (datos personales y métricas de ventas semanales/mensuales).
 */
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Permite al agricultor consultar su propio perfil y resumen de ventas.
   * @param request - Objeto request con los datos del token.
   * @returns Perfil completo con ventas.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async getMine(@Req() request): Promise<Profile> {
    return await this.profileService.getProfile(request.user.sub);
  }
}
