import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOffertDto } from '../../../src/offerts/dto/create-offert.dto';

describe('CreateOffertDto', () => {
  // Datos válidos de base: cada test cambia solo el campo que quiere probar.
  // El farmerId no va aquí: sale del token del agricultor autenticado
  const datosValidos = {
    productId: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f',
    description: 'Tomate cosechado esta semana',
    pricePerUnit: 3500,
    availableQuantity: 120,
    harvestDate: '2026-10-01',
  };

  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(plainToInstance(CreateOffertDto, datos));
    return errores.map((error) => error.property);
  };

  it('acepta datos válidos', async () => {
    // Arrange
    const datos = datosValidos;

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toEqual([]);
  });

  it('acepta una oferta sin descripción ni fecha de cosecha', async () => {
    // Arrange
    const datos = {
      ...datosValidos,
      description: undefined,
      harvestDate: undefined,
    };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toEqual([]);
  });

  it('rechaza un productId que no es un UUID', async () => {
    // Arrange
    const datos = { ...datosValidos, productId: 'tomate' };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('productId');
  });

  it('rechaza un precio igual a 0', async () => {
    // Arrange
    const datos = { ...datosValidos, pricePerUnit: 0 };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('pricePerUnit');
  });

  it('rechaza una fecha de cosecha con formato inválido', async () => {
    // Arrange
    const datos = { ...datosValidos, harvestDate: '01/10/2026' };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('harvestDate');
  });
});
