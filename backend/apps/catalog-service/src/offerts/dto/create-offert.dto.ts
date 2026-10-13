import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

// El farmerId no se recibe aquí: sale del token del agricultor autenticado.
// El municipio tampoco: es el del agricultor (users-service solo acepta Envigado).
// La calidad la asigna el modelo de IA, no el agricultor
export class CreateOffertDto {
  @IsUUID('all', { message: 'El producto no es válido' })
  productId: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsPositive({ message: 'El precio por unidad debe ser mayor a 0' })
  pricePerUnit: number;

  @IsPositive({ message: 'La cantidad disponible debe ser mayor a 0' })
  availableQuantity: number;

  // Formato YYYY-MM-DD
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cosecha no es válida' })
  harvestDate?: string;
}
