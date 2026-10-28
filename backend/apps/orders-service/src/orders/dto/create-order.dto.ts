import { ApiProperty } from '@nestjs/swagger';
import { IsPositive, IsUUID } from 'class-validator';

/**
 * Objeto de transferencia de datos (DTO) para la creación de una orden.
 * El comprador se extrae del token de autenticación; el agricultor y el precio unitario se obtienen de la oferta.
 */
export class CreateOrderDto {
  /** Identificador único de la oferta seleccionada. */
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'La oferta no es válida' })
  offertId: string;

  /** Cantidad del producto que se desea pedir. */
  @ApiProperty({ example: 5, minimum: 0, exclusiveMinimum: true })
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  quantity: number;
}
