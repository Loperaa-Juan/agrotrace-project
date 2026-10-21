import {
  IsDateString,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * Objeto de transferencia de datos (DTO) para la creación de una oferta por parte del agricultor.
 * Nota: El identificador del agricultor (farmerId) no se recibe aquí, ya que se extrae del token de sesión.
 * La calidad es calculada automáticamente por el sistema de visión artificial y no es ingresada manualmente.
 */
export class CreateOffertDto {
  /** Identificador único del producto maestro del catálogo que se va a ofertar. */
  @IsUUID('all', { message: 'El producto no es válido' })
  productId: string;

  /** Descripción o notas específicas opcionales para esta oferta en particular. */
  @IsOptional()
  @IsString()
  description?: string;

  /** Precio monetario establecido por cada unidad de medida (debe ser mayor a cero). */
  @IsPositive({ message: 'El precio por unidad debe ser mayor a 0' })
  pricePerUnit: number;

  /** Cantidad total disponible del producto para la oferta (debe ser mayor a cero). */
  @IsPositive({ message: 'La cantidad disponible debe ser mayor a 0' })
  availableQuantity: number;

/** Fecha aproximada de cosecha del producto bajo formato YYYY-MM-DD. */
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cosecha no es válida' })
  harvestDate?: string;
}
