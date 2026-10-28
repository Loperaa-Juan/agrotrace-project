import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { Profile, ProfileService } from './profile.service';
import { ProfileDto } from './dto/profile.dto';

/**
 * Controlador de perfil del agricultor (datos personales y métricas de ventas semanales/mensuales).
 */
@ApiTags('profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * Permite al agricultor consultar su propio perfil y resumen de ventas.
   * @param request - Objeto request con los datos del token.
   * @returns Perfil completo con ventas.
   */
  @ApiOperation({
    summary: 'Consulta el perfil y las ventas del agricultor autenticado',
  })
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Datos del agricultor y ventas de la semana y del mes',
    type: ProfileDto,
  })
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({
    description: 'El usuario no tiene el rol Agricultor',
  })
  @ApiNotFoundResponse({
    description: 'El usuario ya no existe en users-service',
  })
  @ApiServiceUnavailableResponse({ description: 'users-service no responde' })
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async getMine(@Req() request): Promise<Profile> {
    return await this.profileService.getProfile(request.user.sub);
  }
}
