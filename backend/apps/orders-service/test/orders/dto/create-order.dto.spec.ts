import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from '../../../src/orders/dto/create-order.dto';

describe('CreateOrderDto', () => {
  // Datos válidos de base: cada test cambia solo el campo que quiere probar.
  // El comprador sale del token; el agricultor y el precio salen de la oferta
  const datosValidos = {
    offertId: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f',
    quantity: 10,
  };

  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(plainToInstance(CreateOrderDto, datos));
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

  it('rechaza un offertId que no es un UUID', async () => {
    // Arrange
    const datos = { ...datosValidos, offertId: 'oferta-1' };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('offertId');
  });

  it('rechaza una cantidad igual a 0', async () => {
    // Arrange
    const datos = { ...datosValidos, quantity: 0 };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('quantity');
  });
});
