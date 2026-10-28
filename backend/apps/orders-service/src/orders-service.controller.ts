import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersServiceService } from './orders-service.service';

/**
 * Controlador raíz de verificación para orders-service.
 */
@ApiTags('health')
@Controller()
export class OrdersServiceController {
  constructor(private readonly ordersServiceService: OrdersServiceService) {}

  /**
   * Endpoint de prueba para comprobar que el servicio está activo.
   * @returns Mensaje de saludo.
   */
  @ApiOperation({ summary: 'Comprueba que el servicio de pedidos responde' })
  @ApiOkResponse({ description: 'Mensaje de bienvenida del servicio' })
  @Get()
  getHello(): string {
    return this.ordersServiceService.getHello();
  }
}
