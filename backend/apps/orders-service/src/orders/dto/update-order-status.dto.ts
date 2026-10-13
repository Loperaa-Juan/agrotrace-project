import { IsIn } from 'class-validator';
import { OrderStatus } from '../../entities/order.entity';

// Solicitado es solo el estado inicial: nadie puede devolver un pedido a ese estado.
// Entregado tampoco: se marca con el código de entrega (PATCH /orders/:id/deliver).
// Quién puede pasar a cada estado (agricultor o comprador) lo decide el servicio
const ESTADOS_PERMITIDOS = [
  OrderStatus.ACEPTADO,
  OrderStatus.RECHAZADO,
  OrderStatus.CANCELADO,
];

export class UpdateOrderStatusDto {
  @IsIn(ESTADOS_PERMITIDOS, {
    message: 'El estado debe ser Aceptado, Rechazado o Cancelado',
  })
  status: OrderStatus;
}
