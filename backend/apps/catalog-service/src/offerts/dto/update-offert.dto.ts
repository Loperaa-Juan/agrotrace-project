import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ example: 'Cosecha de la semana, sin químicos' })
  @IsOptional()
  @IsString()
  description?: string;

  /** Nuevo precio unitario opcional (estrictamente positivo). */
  @ApiPropertyOptional({ minimum: 0, exclusiveMinimum: true, example: 2500 })
  @IsOptional()
  @IsPositive({ message: 'El precio por unidad debe ser mayor a 0' })
  pricePerUnit?: number;

  /** Nueva cantidad disponible opcional (estrictamente positiva). */
  @ApiPropertyOptional({ minimum: 0, exclusiveMinimum: true, example: 100 })
  @IsOptional()
  @IsPositive({ message: 'La cantidad disponible debe ser mayor a 0' })
  availableQuantity?: number;

  /** Nueva fecha de cosecha opcional bajo formato YYYY-MM-DD. */
  @ApiPropertyOptional({ format: 'date', example: '2026-10-20' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cosecha no es válida' })
  harvestDate?: string;
}
