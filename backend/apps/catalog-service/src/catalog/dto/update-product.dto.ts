import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProductCategory, UnitOfMeasure } from '../../entities/product.entitie';

/**
 * Objeto de transferencia de datos (DTO) para la actualización parcial de un producto del catálogo maestro.
 * Comparte las mismas reglas de validación que CreateProductDto, pero todos los campos son opcionales.
 */
export class UpdateProductDto {
  /** Nuevo nombre comercial opcional para el producto. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  /** Nueva categoría opcional del producto. */
  @IsOptional()
  @IsEnum(ProductCategory, {
    message: 'La categoría del producto no es válida',
  })
  category?: ProductCategory;

  /** Nueva unidad de medida opcional. */
  @IsOptional()
  @IsEnum(UnitOfMeasure, {
    message: 'La unidad de medida no es válida',
  })
  unitOfMeasure?: UnitOfMeasure;

  /** Nueva descripción opcional del producto. */
  @IsOptional()
  @IsString()
  description?: string;
}
