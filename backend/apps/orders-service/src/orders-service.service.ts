import { Injectable } from '@nestjs/common';

/**
 * Servicio raíz base del microservicio para operaciones generales de salud del sistema.
 */
@Injectable()
export class OrdersServiceService {
  /**
   * Retorna un saludo de verificación.
   * @returns {string} Cadena con el texto "Hello World!".
   */
  getHello(): string {
    return 'Hello World!';
  }
}
