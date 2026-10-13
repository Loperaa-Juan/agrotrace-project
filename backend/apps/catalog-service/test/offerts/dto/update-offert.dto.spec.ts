import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOffertDto } from '../../../src/offerts/dto/update-offert.dto';

describe('UpdateOffertDto', () => {
  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(plainToInstance(UpdateOffertDto, datos));
    return errores.map((error) => error.property);
  };

  it('acepta cambiar un solo campo', async () => {
    // Arrange
    const datos = { availableQuantity: 80 };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toEqual([]);
  });

  it('rechaza un precio igual a 0 aunque los campos sean opcionales', async () => {
    // Arrange
    const datos = { pricePerUnit: 0 };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('pricePerUnit');
  });
});
