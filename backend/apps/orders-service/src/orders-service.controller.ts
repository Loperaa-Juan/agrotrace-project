import { Controller, Get } from '@nestjs/common';
import { OrdersServiceService } from './orders-service.service';

/**
 * Controlador raíz de comprobación para el microservicio de órdenes.
 */
@Controller()
export class OrdersServiceController {
  constructor(private readonly ordersServiceService: OrdersServiceService) {}

  /**
   * Endpoint base de prueba para verificar que el servicio se encuentra activo.
   * @returns {string} Mensaje de saludo básico.
   */
  @Get()
  getHello(): string {
    return this.ordersServiceService.getHello();
  }
}
