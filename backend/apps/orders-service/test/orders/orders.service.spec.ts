import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@app/shared';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderStatus } from '../../src/entities/order.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: any;
  let catalogClient: any;

  // Oferta tal como la devuelve catalog-service (incluye la unidad de medida del producto)
  const offert = {
    OffertId: 'offert-1',
    farmerId: 'farmer-1',
    pricePerUnit: 3500,
    availableQuantity: 500,
    unitOfMeasure: 'lb',
  };

  // Pedido de prueba que simula lo que hay en la BD
  const order = {
    OrderId: 'order-1',
    buyerId: 'buyer-1',
    offertId: 'offert-1',
    farmerId: 'farmer-1',
    quantity: 10,
    unitPrice: 3500,
    totalPrice: 35000,
    status: OrderStatus.SOLICITADO,
    deliveryCode: '482913',
  };

  beforeEach(() => {
    orderRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    // Consulta por TCP la oferta en catalog-service
    catalogClient = {
      getOffert: jest.fn().mockResolvedValue(offert),
      decreaseOffertQuantity: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrdersService(orderRepository, catalogClient);
  });

  describe('create', () => {
    it('Debe crear el pedido Solicitado con los datos de la oferta y un código de 6 dígitos', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(result).toMatchObject({
        buyerId: 'buyer-1',
        farmerId: 'farmer-1',
        unitPrice: 3500,
        totalPrice: 35000,
        status: OrderStatus.SOLICITADO,
        deliveryCode: expect.stringMatching(/^\d{6}$/),
      });
    });

    it('Debe lanzar ForbiddenException si una Persona pide más de 50 libras', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 51 };

      // Act
      const action = service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      await expect(action).rejects.toThrow(ForbiddenException);
    });

    it('Debe permitir que un Negocio pida más de 50 libras', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 51 };

      // Act
      const result = await service.create('buyer-1', Role.NEGOCIO, dto);

      // Assert
      expect(result.quantity).toBe(51);
    });

    it('Debe lanzar BadRequestException si se pide más de la cantidad disponible', async () => {
      // Arrange: la oferta tiene 500 disponibles
      const dto = { offertId: 'offert-1', quantity: 501 };

      // Act
      const action = service.create('buyer-1', Role.NEGOCIO, dto);

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
    });

    it('Debe convertir a libras las ofertas en kilos para aplicar el límite', async () => {
      // Arrange: 30 kg son unas 66 libras
      catalogClient.getOffert.mockResolvedValue({
        ...offert,
        unitOfMeasure: 'kg',
      });
      const dto = { offertId: 'offert-1', quantity: 30 };

      // Act
      const action = service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      await expect(action).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByFarmer', () => {
    it('No debe mostrarle al agricultor el código de entrega', async () => {
      // Arrange: el código lo tiene el comprador y se lo dicta al agricultor al recibir el pedido
      orderRepository.find.mockResolvedValue([{ ...order }]);

      // Act
      const result = await service.findByFarmer('farmer-1');

      // Assert
      expect(result[0]).not.toHaveProperty('deliveryCode');
    });
  });

  describe('deliver', () => {
    // Solo se entregan pedidos que el agricultor ya aceptó
    const aceptado = { ...order, status: OrderStatus.ACEPTADO };

    it('Debe marcar el pedido como Entregado si el código coincide', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...aceptado });

      // Act
      const result = await service.deliver('order-1', 'farmer-1', '482913');

      // Assert
      expect(result.status).toBe(OrderStatus.ENTREGADO);
    });

    it('Debe lanzar BadRequestException si el código no coincide', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...aceptado });

      // Act
      const action = service.deliver('order-1', 'farmer-1', '000000');

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
    });

    it('Debe lanzar ForbiddenException si el pedido es de otro agricultor', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...aceptado });

      // Act
      const action = service.deliver('order-1', 'otro-agricultor', '482913');

      // Assert
      await expect(action).rejects.toThrow(ForbiddenException);
    });

    it('No debe entregar un pedido que el agricultor no ha aceptado', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const action = service.deliver('order-1', 'farmer-1', '482913');

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeStatus', () => {
    it('Al aceptar un pedido debe descontar su cantidad de la oferta', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      await service.changeStatus('order-1', 'farmer-1', OrderStatus.ACEPTADO);

      // Assert
      expect(catalogClient.decreaseOffertQuantity).toHaveBeenCalledWith(
        'offert-1',
        10,
      );
    });

    it('El agricultor debe poder aceptar un pedido Solicitado', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const result = await service.changeStatus(
        'order-1',
        'farmer-1',
        OrderStatus.ACEPTADO,
      );

      // Assert
      expect(result.status).toBe(OrderStatus.ACEPTADO);
    });

    it('El comprador debe poder cancelar un pedido Solicitado', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const result = await service.changeStatus(
        'order-1',
        'buyer-1',
        OrderStatus.CANCELADO,
      );

      // Assert
      expect(result.status).toBe(OrderStatus.CANCELADO);
    });

    it('Debe lanzar ForbiddenException si el comprador intenta aceptar su propio pedido', async () => {
      // Arrange: aceptar o rechazar le corresponde al agricultor; cancelar, al comprador
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const action = service.changeStatus(
        'order-1',
        'buyer-1',
        OrderStatus.ACEPTADO,
      );

      // Assert
      await expect(action).rejects.toThrow(ForbiddenException);
    });

    it('Debe lanzar BadRequestException si el pedido ya no está Solicitado', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({
        ...order,
        status: OrderStatus.CANCELADO,
      });

      // Act
      const action = service.changeStatus(
        'order-1',
        'farmer-1',
        OrderStatus.ACEPTADO,
      );

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
    });
  });
});
