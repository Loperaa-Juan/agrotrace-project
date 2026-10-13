import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard, Role, ROLES_KEY, RolesGuard } from '@app/shared';
import { OrdersController } from '../../src/orders/orders.controller';
import { OrderStatus } from '../../src/entities/order.entity';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: any;

  // Petición de un usuario autenticado: el guard deja el payload del token en request.user
  const comprador: any = { user: { sub: 'buyer-1', role: Role.NEGOCIO } };
  const agricultor: any = { user: { sub: 'farmer-1', role: Role.AGRICULTOR } };

  beforeEach(() => {
    // El servicio falso responde con lo que recibe, así una sola aserción
    // comprueba que el controlador le pasa los datos y retorna su respuesta
    ordersService = {
      create: jest.fn((buyerId, buyerRole, dto) =>
        Promise.resolve({ ...dto, buyerId, buyerRole }),
      ),
      findByBuyer: jest.fn((buyerId) => Promise.resolve([{ buyerId }])),
      findByFarmer: jest.fn((farmerId) => Promise.resolve([{ farmerId }])),
      deliver: jest.fn((orderId, farmerId, deliveryCode) =>
        Promise.resolve({ OrderId: orderId, farmerId, deliveryCode }),
      ),
      changeStatus: jest.fn((orderId, userId, status) =>
        Promise.resolve({ OrderId: orderId, userId, status }),
      ),
    };

    controller = new OrdersController(ordersService);
  });

  it('Debe crear el pedido con el id y el rol del comprador autenticado', async () => {
    // Arrange
    const dto = { offertId: 'offert-1', quantity: 60 };

    // Act
    const result = await controller.create(comprador, dto);

    // Assert
    expect(result).toEqual({
      ...dto,
      buyerId: 'buyer-1',
      buyerRole: Role.NEGOCIO,
    });
  });

  it('Debe listar los pedidos del comprador autenticado', async () => {
    // Arrange
    const peticion = comprador;

    // Act
    const result = await controller.findMine(peticion);

    // Assert
    expect(result).toEqual([{ buyerId: 'buyer-1' }]);
  });

  it('Debe listar los pedidos que recibió el agricultor autenticado', async () => {
    // Arrange
    const peticion = agricultor;

    // Act
    const result = await controller.findReceived(peticion);

    // Assert
    expect(result).toEqual([{ farmerId: 'farmer-1' }]);
  });

  it('Debe entregar el pedido con el código que ingresa el agricultor', async () => {
    // Arrange
    const deliveryCode = '482913';

    // Act
    const result = await controller.deliver(
      agricultor,
      'order-1',
      deliveryCode,
    );

    // Assert
    expect(result).toEqual({
      OrderId: 'order-1',
      farmerId: 'farmer-1',
      deliveryCode: '482913',
    });
  });

  it('Debe cambiar el estado del pedido a nombre del usuario autenticado', async () => {
    // Arrange
    const dto = { status: OrderStatus.ACEPTADO };

    // Act
    const result = await controller.changeStatus(agricultor, 'order-1', dto);

    // Assert
    expect(result).toEqual({
      OrderId: 'order-1',
      userId: 'farmer-1',
      status: OrderStatus.ACEPTADO,
    });
  });

  it('Cada ruta debe exigir token y el rol que le corresponde', () => {
    // Arrange: los compradores piden y ven sus pedidos; el agricultor ve los que recibió y los entrega
    const rolesEsperados = {
      create: [Role.PERSONA, Role.NEGOCIO],
      findMine: [Role.PERSONA, Role.NEGOCIO],
      findReceived: [Role.AGRICULTOR],
      deliver: [Role.AGRICULTOR],
      // Quién puede hacer cada cambio (agricultor o comprador) lo decide el servicio
      changeStatus: [Role.PERSONA, Role.NEGOCIO, Role.AGRICULTOR],
    };

    // Act: roles de cada ruta, solo si tiene JwtAuthGuard y RolesGuard
    const rolesPorRuta = Object.fromEntries(
      Object.keys(rolesEsperados).map((metodo) => {
        const handler = OrdersController.prototype[metodo];
        const guards = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
        const protegida =
          guards.includes(JwtAuthGuard) && guards.includes(RolesGuard);
        return [
          metodo,
          protegida ? Reflect.getMetadata(ROLES_KEY, handler) : 'sin guards',
        ];
      }),
    );

    // Assert
    expect(rolesPorRuta).toEqual(rolesEsperados);
  });
});
