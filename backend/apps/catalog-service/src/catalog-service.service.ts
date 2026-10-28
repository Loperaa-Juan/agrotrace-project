import { Injectable } from '@nestjs/common';

/**
 * Servicio raíz base de catalog-service para operaciones generales de salud del sistema.
 */
@Injectable()
export class CatalogServiceService {
  /**
   * Retorna una cadena de verificación de funcionamiento.
   * @returns Mensaje "Hello World!".
   */
  getHello(): string {
    return 'Hello World!';
  }
}
