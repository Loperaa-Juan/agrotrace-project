import {
  IsDateString,
  IsIn,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

// Por ahora agrotrace solo opera en Envigado
export const MUNICIPIOS_PERMITIDOS = ['Envigado'];

// El farmerId no se recibe aquí: sale del token del agricultor autenticado
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

  @IsIn(MUNICIPIOS_PERMITIDOS, {
    message: 'Por ahora solo se aceptan ofertas en Envigado',
  })
  municipality: string;
}
