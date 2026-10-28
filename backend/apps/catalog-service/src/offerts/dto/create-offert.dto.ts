import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  @ApiProperty({
    format: 'uuid',
    description: 'Id de un producto activo del catálogo',
  })
  @IsUUID('all', { message: 'El producto no es válido' })
  productId: string;

  /** Descripción o notas específicas opcionales para esta oferta en particular. */
  @ApiPropertyOptional({ example: 'Cosecha de la semana, sin químicos' })
  @IsOptional()
  @IsString()
  description?: string;

  /** Precio monetario establecido por cada unidad de medida (debe ser mayor a cero). */
  @ApiProperty({ minimum: 0, exclusiveMinimum: true, example: 2500 })
  @Type(() => Number)
  @IsPositive({ message: 'El precio por unidad debe ser mayor a 0' })
  pricePerUnit: number;

  /** Cantidad total disponible del producto para la oferta (debe ser mayor a cero). */
  @ApiProperty({ minimum: 0, exclusiveMinimum: true, example: 100 })
  @Type(() => Number)
  @IsPositive({ message: 'La cantidad disponible debe ser mayor a 0' })
  availableQuantity: number;

  /** Fecha aproximada de cosecha del producto bajo formato YYYY-MM-DD. */
  @ApiPropertyOptional({ format: 'date', example: '2026-10-20' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cosecha no es válida' })
  harvestDate?: string;
}
