import { IsIn } from 'class-validator';
import { OrderStatus } from '../../entities/order.entity';

/**
 * Estados permitidos para la actualización manual por parte de los actores del sistema.
 * Nota: 'Solicitado' es el estado inicial (nadie puede regresar un pedido a este estado) 
 * y 'Entregado' se gestiona exclusivamente mediante el flujo de validación del código de entrega.
 */
const ESTADOS_PERMITIDOS = [
  OrderStatus.ACEPTADO,
  OrderStatus.RECHAZADO,
  OrderStatus.CANCELADO,
];

/**
 * Objeto de transferencia de datos (DTO) para actualizar el estado de una orden existente.
 */
export class UpdateOrderStatusDto {
  /**
   * Nuevo estado que se le asignará a la orden.
   */
  @IsIn(ESTADOS_PERMITIDOS, {
    message: 'El estado debe ser Aceptado, Rechazado o Cancelado',
  })
  status: OrderStatus;
}
