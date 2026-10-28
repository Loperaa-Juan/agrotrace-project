import { Controller, Get } from '@nestjs/common';
import { OrdersServiceService } from './orders-service.service';

/**
 * Controlador raíz de verificación para orders-service.
 */
@Controller()
export class OrdersServiceController {
  constructor(private readonly ordersServiceService: OrdersServiceService) {}

  /**
   * Endpoint de prueba para comprobar que el servicio está activo.
   * @returns Mensaje de saludo.
   */
  @Get()
  getHello(): string {
    return this.ordersServiceService.getHello();
  }
}
