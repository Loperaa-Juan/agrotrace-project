import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersServiceService } from './users-service.service';
/**
 * Controlador encargado de manejar las peticiones HTTP relacionadas con las rutas generales
 * de usuarios
 */
@ApiTags('health')
@Controller()
export class UsersServiceController {
  constructor(private readonly usersServiceService: UsersServiceService) {}
  /**
   * Endopoit de verificacion y bienvenida del estado del microservicio
   * @returns Mensaje de confirmacion de que el servicio de usuarios responde
   */
  @ApiOperation({ summary: 'Comprueba que el servicio de usuarios responde' })
  @ApiOkResponse({ description: 'Mensaje de bienvenida del servicio' })
  @Get()
  getHello(): string {
    return this.usersServiceService.getHello();
  }
}
