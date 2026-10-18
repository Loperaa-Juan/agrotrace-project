import { Controller, Get } from '@nestjs/common';
import { UsersServiceService } from './users-service.service';
/**
 * Controlador encargado de manejar las peticiones HTTP relacionadas con las rutas generales
 * de usuarios
 */
@Controller()
export class UsersServiceController {
  constructor(private readonly usersServiceService: UsersServiceService) {}
  /**
   * Endopoit de verificacion y bienvenida del estado del microservicio
   * @returns {string} Mensaje de confirmacion de que el servicio de usuarios responde
   */
  @Get()
  getHello(): string {
    return this.usersServiceService.getHello();
  }
}
