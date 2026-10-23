import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProductCategory, UnitOfMeasure } from '../../entities/product.entitie';

/**
 * Objeto de transferencia de datos (DTO) para la creación de un nuevo producto en el catálogo maestro.
 * Todos los campos definidos en esta clase son obligatorios.
 */
export class CreateProductDto {
  /** Nombre comercial del producto (máximo 100 caracteres). */
  @ApiProperty({ example: 'Tomate chonto', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** Categoría oficial del producto agrícola. */
  @ApiProperty({ enum: ProductCategory, example: ProductCategory.HORTALIZAS })
  @IsEnum(ProductCategory, {
    message: 'La categoría del producto no es válida',
  })
  category: ProductCategory;

  /** Unidad de medida estándar para su comercialización. */
  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.LIBRA })
  @IsEnum(UnitOfMeasure, {
    message: 'La unidad de medida no es válida',
  })
  unitOfMeasure: UnitOfMeasure;

  /** Descripción general de las características del producto. */
  @ApiProperty({ example: 'Tomate rojo para ensalada' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
