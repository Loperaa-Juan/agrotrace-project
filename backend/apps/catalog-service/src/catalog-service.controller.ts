import { Controller, Get } from '@nestjs/common';
import { CatalogServiceService } from './catalog-service.service';

/**
 * Controlador raíz de verificación para catalog-service.
 */
@Controller()
export class CatalogServiceController {
  constructor(private readonly catalogServiceService: CatalogServiceService) {}

  /**
   * Endpoint base de prueba para comprobar que el servicio de catálogo se encuentra operativo.
   * @returns Mensaje de saludo básico.
   */
  @Get()
  getHello(): string {
    return this.catalogServiceService.getHello();
  }
}
