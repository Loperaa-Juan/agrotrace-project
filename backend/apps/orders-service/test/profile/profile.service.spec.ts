import { ProfileService } from '../../src/profile/profile.service';
import { OrderStatus } from '../../src/entities/order.entity';

describe('ProfileService', () => {
  let service: ProfileService;
  let orderRepository: any;
  let usersClient: any;
  let orders: any[];

  const user = {
    userId: 'farmer-1',
    name: 'Juan',
    email: 'juan@agrotrace.com',
    role: 'Agricultor',
  };

  // Una venta es un pedido Entregado; su fecha es la de entrega (updatedAt)
  const venta = (totalPrice: number, updatedAt: Date, extra = {}) => ({
    farmerId: 'farmer-1',
    status: OrderStatus.ENTREGADO,
    totalPrice,
    updatedAt,
    ...extra,
  });

  beforeEach(() => {
    // Hoy es miércoles 14 de octubre de 2026: la semana empezó el lunes 12 y el mes el jueves 1
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 14, 12, 0));

    orders = [];

    // El repositorio falso aplica el filtro por agricultor y estado como lo haría la BD
    orderRepository = {
      find: jest.fn(({ where }) =>
        Promise.resolve(
          orders.filter(
            (order) =>
              order.farmerId === where.farmerId &&
              (!where.status || order.status === where.status),
          ),
        ),
      ),
    };

    // Consulta por TCP el usuario en users-service
    usersClient = { getUser: jest.fn().mockResolvedValue(user) };

    service = new ProfileService(orderRepository, usersClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('Debe devolver la información del usuario', async () => {
    // Arrange
    const userId = 'farmer-1';

    // Act
    const result = await service.getProfile(userId);

    // Assert
    expect(usersClient.getUser).toHaveBeenCalledWith('farmer-1');
    expect(result.user).toEqual(user);
  });

  it('Debe sumar las ventas de la semana, desde el lunes', async () => {
    // Arrange
    orders = [
      venta(35000, new Date(2026, 9, 13, 10, 0)), // martes de esta semana
      venta(15000, new Date(2026, 9, 12, 0, 0)), // lunes a primera hora
      venta(20000, new Date(2026, 9, 11, 23, 0)), // domingo: semana anterior
    ];

    // Act
    const result = await service.getProfile('farmer-1');

    // Assert
    expect(result.sales.week).toEqual({ total: 50000, count: 2 });
  });

  it('Debe sumar las ventas del mes, desde el día 1', async () => {
    // Arrange
    orders = [
      venta(35000, new Date(2026, 9, 13, 10, 0)), // esta semana
      venta(20000, new Date(2026, 9, 1, 8, 0)), // primer día del mes
      venta(10000, new Date(2026, 8, 30, 18, 0)), // mes anterior
    ];

    // Act
    const result = await service.getProfile('farmer-1');

    // Assert
    expect(result.sales.month).toEqual({ total: 55000, count: 2 });
  });

  it('Solo debe contar los pedidos entregados del agricultor', async () => {
    // Arrange
    const martes = new Date(2026, 9, 13, 10, 0);
    orders = [
      venta(35000, martes),
      venta(50000, martes, { status: OrderStatus.ACEPTADO }),
      venta(40000, martes, { status: OrderStatus.CANCELADO }),
      venta(99000, martes, { farmerId: 'otro-agricultor' }),
    ];

    // Act
    const result = await service.getProfile('farmer-1');

    // Assert
    expect(result.sales).toEqual({
      week: { total: 35000, count: 1 },
      month: { total: 35000, count: 1 },
    });
  });

  it('Debe devolver ventas en cero si el agricultor no ha vendido', async () => {
    // Arrange
    orders = [];

    // Act
    const result = await service.getProfile('farmer-1');

    // Assert
    expect(result.sales).toEqual({
      week: { total: 0, count: 0 },
      month: { total: 0, count: 0 },
    });
  });
});
