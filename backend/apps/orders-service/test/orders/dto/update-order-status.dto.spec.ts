import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOrderStatusDto } from '../../../src/orders/dto/update-order-status.dto';
import { OrderStatus } from '../../../src/entities/order.entity';

describe('UpdateOrderStatusDto', () => {
  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(
      plainToInstance(UpdateOrderStatusDto, datos),
    );
    return errores.map((error) => error.property);
  };

  it('acepta un estado válido', async () => {
    // Arrange
    const datos = { status: OrderStatus.ACEPTADO };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toEqual([]);
  });

  it('rechaza un estado que no existe', async () => {
    // Arrange
    const datos = { status: 'Enviado' };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('status');
  });

  it('rechaza devolver un pedido al estado Solicitado', async () => {
    // Arrange
    const datos = { status: OrderStatus.SOLICITADO };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('status');
  });

  it('rechaza pasar a Entregado: eso se hace con el código de entrega', async () => {
    // Arrange
    const datos = { status: OrderStatus.ENTREGADO };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('status');
  });
});
