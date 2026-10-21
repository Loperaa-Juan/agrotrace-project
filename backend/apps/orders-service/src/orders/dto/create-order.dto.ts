import { IsPositive, IsUUID } from 'class-validator';

/**
 * Objeto de transferencia de datos (DTO) para la creación de una nueva orden.
 * El comprador se obtiene automáticamente del token de sesión; el agricultor y el precio base se consultan directamente de la oferta.
 */
export class CreateOrderDto {
  /**
   * Identificador único de la oferta seleccionada.
   */
  @IsUUID('all', { message: 'La oferta no es válida' })
  offertId: string;

  /**
   * Cantidad solicitada del producto.
   */
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  quantity: number;
}
