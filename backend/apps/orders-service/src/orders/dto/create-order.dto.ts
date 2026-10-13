import { IsPositive, IsUUID } from 'class-validator';

// El comprador sale del token; el agricultor y el precio se toman de la oferta
export class CreateOrderDto {
  @IsUUID('all', { message: 'La oferta no es válida' })
  offertId: string;

  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  quantity: number;
}
