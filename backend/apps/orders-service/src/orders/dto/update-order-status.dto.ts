import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { OrderStatus } from '../../entities/order.entity';

/**
 * Estados permitidos para actualización manual por DTO.
 * Nota: 'Solicitado' es solo el estado inicial y 'Entregado' se gestiona mediante el endpoint de entrega por código.
 */
const ESTADOS_PERMITIDOS = [
  OrderStatus.ACEPTADO,
  OrderStatus.RECHAZADO,
  OrderStatus.CANCELADO,
];

/**
 * Objeto de transferencia de datos (DTO) para actualizar el estado de una orden.
 */
export class UpdateOrderStatusDto {
  /** Nuevo estado deseado para la orden (Aceptado, Rechazado o Cancelado). */
  @ApiProperty({ enum: ESTADOS_PERMITIDOS, example: OrderStatus.ACEPTADO })
  @IsIn(ESTADOS_PERMITIDOS, {
    message: 'El estado debe ser Aceptado, Rechazado o Cancelado',
  })
  status: OrderStatus;
}
