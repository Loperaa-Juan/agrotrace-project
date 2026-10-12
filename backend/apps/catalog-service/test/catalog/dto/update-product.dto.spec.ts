import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateProductDto } from '../../../src/catalog/dto/update-product.dto';
import { UnitOfMeasure } from '../../../src/entities/product.entitie';

describe('UpdateProductDto', () => {
  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(plainToInstance(UpdateProductDto, datos));
    return errores.map((error) => error.property);
  };

  it('acepta cambiar un solo campo', async () => {
    expect(
      await camposConError({ unitOfMeasure: UnitOfMeasure.KILOGRAMO }),
    ).toEqual([]);
  });

  it('rechaza un nombre vacío aunque los campos sean opcionales', async () => {
    expect(await camposConError({ name: '' })).toContain('name');
  });

  it('rechaza una categoría que no existe', async () => {
    expect(await camposConError({ category: 'Lácteos' })).toContain('category');
  });
});
