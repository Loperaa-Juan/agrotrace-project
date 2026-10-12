import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProductCategory, UnitOfMeasure } from '../../entities/product.entitie';

// Mismas reglas que CreateProductDto, pero todos los campos son opcionales
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(ProductCategory, {
    message: 'La categoría del producto no es válida',
  })
  category?: ProductCategory;

  @IsOptional()
  @IsEnum(UnitOfMeasure, {
    message: 'La unidad de medida no es válida',
  })
  unitOfMeasure?: UnitOfMeasure;

  @IsOptional()
  @IsString()
  description?: string;
}
