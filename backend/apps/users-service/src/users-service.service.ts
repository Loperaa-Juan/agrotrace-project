import { Injectable } from '@nestjs/common';
/**
 * Servicio principal para la gestion de usuarios y autenticacion de Agrotrace
 */
@Injectable()
export class UsersServiceService {
  /**
   * Metodo de pruebas para verificar el estado del microservicio de usuarios
   * @returns Saludo de confirmacion de que el servicio esta activo
   */
  getHello(): string {
    return 'Hello World!';
  }
}
