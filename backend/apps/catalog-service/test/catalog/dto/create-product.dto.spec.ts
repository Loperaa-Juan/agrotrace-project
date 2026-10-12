import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from '../../../src/catalog/dto/create-product.dto';
import {
  ProductCategory,
  UnitOfMeasure,
} from '../../../src/entities/product.entitie';

describe('CreateProductDto', () => {
  // Datos válidos de base: cada test cambia solo el campo que quiere probar
  const datosValidos = {
    name: 'Tomate chonto',
    category: ProductCategory.HORTALIZAS,
    unitOfMeasure: UnitOfMeasure.LIBRA,
    description: 'Tomate rojo para ensalada',
  };

  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(plainToInstance(CreateProductDto, datos));
    return errores.map((error) => error.property);
  };

  it('acepta datos válidos', async () => {
    expect(await camposConError(datosValidos)).toEqual([]);
  });

  it('rechaza un producto sin unidad de medida', async () => {
    expect(
      await camposConError({ ...datosValidos, unitOfMeasure: undefined }),
    ).toContain('unitOfMeasure');
  });

  it('rechaza un producto sin descripción', async () => {
    expect(
      await camposConError({ ...datosValidos, description: undefined }),
    ).toContain('description');
  });

  it('rechaza un nombre vacío', async () => {
    expect(await camposConError({ ...datosValidos, name: '' })).toContain(
      'name',
    );
  });

  it('rechaza un nombre de más de 100 caracteres', async () => {
    expect(
      await camposConError({ ...datosValidos, name: 'a'.repeat(101) }),
    ).toContain('name');
  });

  it('rechaza una categoría que no existe', async () => {
    expect(
      await camposConError({ ...datosValidos, category: 'Lácteos' }),
    ).toContain('category');
  });

  it('rechaza una unidad de medida que no existe', async () => {
    expect(
      await camposConError({ ...datosValidos, unitOfMeasure: 'tonelada' }),
    ).toContain('unitOfMeasure');
  });
});
