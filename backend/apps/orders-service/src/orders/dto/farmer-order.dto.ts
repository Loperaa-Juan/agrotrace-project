import { OmitType } from '@nestjs/swagger';
import { Order } from '../../entities/order.entity';

/**
 * Pedido tal como lo ve el agricultor: igual que {@link Order} pero sin el código de entrega,
 * que solo conoce el comprador. Representa el tipo `FarmerOrder` en la documentación Swagger.
 */
export class FarmerOrderDto extends OmitType(Order, [
  'deliveryCode',
] as const) {}
