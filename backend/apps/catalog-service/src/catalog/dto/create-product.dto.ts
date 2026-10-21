import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProductCategory, UnitOfMeasure } from '../../entities/product.entitie';

/**
 * Objeto de transferencia de datos (DTO) para la creación de un nuevo producto en el catálogo maestro.
 * Todos los campos definidos en esta clase son obligatorios.
 */
export class CreateProductDto {
  /** Nombre comercial del producto (máximo 100 caracteres). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** Categoría oficial del producto agrícola. */
  @IsEnum(ProductCategory, {
    message: 'La categoría del producto no es válida',
  })
  category: ProductCategory;

  /** Unidad de medida estándar para su comercialización. */
  @IsEnum(UnitOfMeasure, {
    message: 'La unidad de medida no es válida',
  })
  unitOfMeasure: UnitOfMeasure;

  /** Descripción general de las características del producto. */
  @IsString()
  @IsNotEmpty()
  description: string;
}
