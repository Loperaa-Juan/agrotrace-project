import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { Profile, ProfileService } from './profile.service';

// Perfil del agricultor: sus datos y lo que vendió en la semana y en el mes.
// El id siempre sale del token (request.user)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async getMine(@Req() request): Promise<Profile> {
    return await this.profileService.getProfile(request.user.sub);
  }
}
