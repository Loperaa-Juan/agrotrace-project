import { getMetadataArgsStorage } from 'typeorm';
import { Order } from '../../src/entities/order.entity';

describe('Order', () => {
  // Columna 'farmer' tal como TypeORM la registra a partir de los decoradores
  const farmerColumn = () =>
    getMetadataArgsStorage().columns.find(
      (column) => column.target === Order && column.propertyName === 'farmer',
    );

  it('Debe tener una columna farmer con los datos del agricultor', () => {
    // Act
    const column = farmerColumn();

    // Assert
    expect(column).toBeDefined();
  });

  it('Debe guardar los datos del agricultor como JSON', () => {
    // Act
    const column = farmerColumn();

    // Assert
    expect(column?.options.type).toBe('jsonb');
  });

  it('Debe permitir pedidos sin datos del agricultor (pedidos creados antes del cambio)', () => {
    // Act
    const column = farmerColumn();

    // Assert
    expect(column?.options.nullable).toBe(true);
  });
});
