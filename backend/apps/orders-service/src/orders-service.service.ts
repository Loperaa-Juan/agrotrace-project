import { Injectable } from '@nestjs/common';

/**
 * Servicio raíz base para comprobaciones de estado.
 */
@Injectable()
export class OrdersServiceService {
  /**
   * Retorna un saludo de prueba.
   * @returns {string} Mensaje "Hello World!".
   */
  getHello(): string {
    return 'Hello World!';
  }
}
