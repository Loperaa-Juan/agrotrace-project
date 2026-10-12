import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProductCategory, UnitOfMeasure } from '../../entities/product.entitie';

// Todos los campos son obligatorios al crear un producto del catálogo
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(ProductCategory, {
    message: 'La categoría del producto no es válida',
  })
  category: ProductCategory;

  @IsEnum(UnitOfMeasure, {
    message: 'La unidad de medida no es válida',
  })
  unitOfMeasure: UnitOfMeasure;

  @IsString()
  @IsNotEmpty()
  description: string;
}
