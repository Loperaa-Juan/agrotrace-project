import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

/**
 * Objeto de transferencia de datos (DTO) para la actualización de una oferta existente.
 * Todos los campos son opcionales. El producto asociado (productId) no puede modificarse.
 */
export class UpdateOffertDto {
  /** Nueva descripción opcional para la oferta. */
  @IsOptional()
  @IsString()
  description?: string;

  /** Nuevo precio unitario opcional (estrictamente positivo). */
  @IsOptional()
  @IsPositive({ message: 'El precio por unidad debe ser mayor a 0' })
  pricePerUnit?: number;

  /** Nueva cantidad disponible opcional (estrictamente positiva). */
  @IsOptional()
  @IsPositive({ message: 'La cantidad disponible debe ser mayor a 0' })
  availableQuantity?: number;

  /** Nueva fecha de cosecha opcional bajo formato YYYY-MM-DD. */
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cosecha no es válida' })
  harvestDate?: string;
}
