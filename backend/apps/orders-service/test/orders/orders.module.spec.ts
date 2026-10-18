import { MODULE_METADATA } from '@nestjs/common/constants';
import { OrdersModule } from '../../src/orders/orders.module';
import { UsersClient } from '../../src/profile/users.client';

describe('OrdersModule', () => {
  it('Debe proveer UsersClient para consultar al agricultor al crear un pedido', () => {
    // Act
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      OrdersModule,
    );

    // Assert
    expect(providers).toContain(UsersClient);
  });

  it('Debe registrar el cliente TCP de users-service', () => {
    // Arrange: ClientsModule.register devuelve un módulo dinámico con un provider por cliente
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, OrdersModule);

    // Act
    const tokens = imports
      .flatMap((imported) => imported.providers ?? [])
      .map((provider) => provider.provide);

    // Assert
    expect(tokens).toContain('USERS_SERVICE');
  });
});
