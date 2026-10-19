import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Role } from '@app/shared';
import { OrdersService } from '../../src/orders/orders.service';
import { OrderStatus } from '../../src/entities/order.entity';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: any;
  let catalogClient: any;
  let usersClient: any;

  // Oferta tal como la devuelve catalog-service (incluye la unidad de medida del producto)
  const offert = {
    OffertId: 'offert-1',
    farmerId: 'farmer-1',
    pricePerUnit: 3500,
    availableQuantity: 500,
    unitOfMeasure: 'lb',
  };

  // Agricultor dueño de la oferta tal como lo devuelve users-service
  const farmerUser = {
    userId: 'farmer-1',
    name: 'Don Pedro',
    email: 'pedro@finca.com',
    documentType: 'CC',
    documentNumber: '123456789',
    phone: '3001234567',
    address: 'Vereda La Esperanza',
    municipality: 'Rionegro',
    role: 'Agricultor',
  };

  // Datos del agricultor que se guardan en el pedido (sin datos privados)
  const farmer = {
    userId: 'farmer-1',
    name: 'Don Pedro',
    phone: '3001234567',
    municipality: 'Rionegro',
  };

  // Comprador que hace el pedido tal como lo devuelve users-service
  const buyerUser = {
    userId: 'buyer-1',
    name: 'Ana Gómez',
    email: 'ana@correo.com',
    documentType: 'CC',
    documentNumber: '987654321',
    phone: '3157654321',
    address: 'Calle 10 # 20-30',
    municipality: 'Medellín',
    role: 'Persona',
  };

  // Datos del comprador que se guardan en el pedido (sin datos privados)
  const buyer = {
    userId: 'buyer-1',
    name: 'Ana Gómez',
    phone: '3157654321',
    municipality: 'Medellín',
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

    // Consulta por TCP el agricultor y el comprador en users-service
    usersClient = {
      getUser: jest.fn((userId: string) =>
        Promise.resolve(userId === 'buyer-1' ? buyerUser : farmerUser),
      ),
    };

    service = new OrdersService(orderRepository, catalogClient, usersClient);
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
    it('Debe consultar en users-service al agricultor dueño de la oferta', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(usersClient.getUser).toHaveBeenCalledWith('farmer-1');
    });

    it('Debe guardar en el pedido el nombre, teléfono y municipio del agricultor', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ farmer }),
      );
    });

    it('Debe devolver el pedido creado con los datos del agricultor', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(result.farmer).toEqual(farmer);
    });

    it('No debe guardar en el pedido los datos privados del agricultor', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(result.farmer).not.toHaveProperty('email');
      expect(result.farmer).not.toHaveProperty('documentNumber');
      expect(result.farmer).not.toHaveProperty('address');
    });

    it('Debe guardar el agricultor de la oferta pedida, no uno fijo', async () => {
      // Arrange: la oferta es de otro agricultor
      catalogClient.getOffert.mockResolvedValue({
        ...offert,
        farmerId: 'farmer-2',
      });
      usersClient.getUser.mockResolvedValue({
        ...farmerUser,
        userId: 'farmer-2',
        name: 'Doña Rosa',
        phone: '3109876543',
        municipality: 'Marinilla',
      });
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(usersClient.getUser).toHaveBeenCalledWith('farmer-2');
      expect(result.farmer).toEqual({
        userId: 'farmer-2',
        name: 'Doña Rosa',
        phone: '3109876543',
        municipality: 'Marinilla',
      });
    });

    it('No debe crear el pedido si el agricultor no existe', async () => {
      // Arrange
      usersClient.getUser.mockRejectedValue(
        new NotFoundException('User not found'),
      );
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const action = service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('No debe crear el pedido si users-service no responde', async () => {
      // Arrange
      usersClient.getUser.mockRejectedValue(
        new ServiceUnavailableException('Users service is unavailable'),
      );
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const action = service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      await expect(action).rejects.toThrow(ServiceUnavailableException);
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('No debe consultar al agricultor si el pedido no es válido', async () => {
      // Arrange: la oferta tiene 500 disponibles
      const dto = { offertId: 'offert-1', quantity: 501 };

      // Act
      const action = service.create('buyer-1', Role.NEGOCIO, dto);

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
      expect(usersClient.getUser).not.toHaveBeenCalled();
    });
    it('Debe consultar en users-service al comprador que hace el pedido', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(usersClient.getUser).toHaveBeenCalledWith('buyer-1');
    });

    it('Debe guardar en el pedido el nombre, teléfono y municipio del comprador', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(orderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ buyer }),
      );
    });

    it('No debe guardar en el pedido los datos privados del comprador', async () => {
      // Arrange
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      expect(result.buyer).not.toHaveProperty('email');
      expect(result.buyer).not.toHaveProperty('documentNumber');
      expect(result.buyer).not.toHaveProperty('address');
    });

    it('Debe guardar el comprador del token, no uno fijo', async () => {
      // Arrange
      usersClient.getUser.mockImplementation((userId: string) =>
        Promise.resolve(
          userId === 'buyer-2'
            ? {
                ...buyerUser,
                userId: 'buyer-2',
                name: 'Restaurante El Fogón',
                phone: '3201112233',
                municipality: 'Envigado',
              }
            : farmerUser,
        ),
      );
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await service.create('buyer-2', Role.NEGOCIO, dto);

      // Assert
      expect(result.buyer).toEqual({
        userId: 'buyer-2',
        name: 'Restaurante El Fogón',
        phone: '3201112233',
        municipality: 'Envigado',
      });
    });

    it('No debe crear el pedido si el comprador no existe', async () => {
      // Arrange
      usersClient.getUser.mockImplementation((userId: string) =>
        userId === 'buyer-1'
          ? Promise.reject(new NotFoundException('User not found'))
          : Promise.resolve(farmerUser),
      );
      const dto = { offertId: 'offert-1', quantity: 10 };

      // Act
      const action = service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('No debe consultar al comprador si el pedido no es válido', async () => {
      // Arrange: una Persona no puede pedir más de 50 libras
      const dto = { offertId: 'offert-1', quantity: 51 };

      // Act
      const action = service.create('buyer-1', Role.PERSONA, dto);

      // Assert
      await expect(action).rejects.toThrow(ForbiddenException);
      expect(usersClient.getUser).not.toHaveBeenCalled();
    });
  });

  describe('findByBuyer', () => {
    it('Debe devolver los pedidos del comprador con los datos del agricultor', async () => {
      // Arrange
      orderRepository.find.mockResolvedValue([{ ...order, farmer }]);

      // Act
      const result = await service.findByBuyer('buyer-1');

      // Assert
      expect(result[0].farmer).toEqual(farmer);
    });

    it('Debe buscar solo los pedidos del comprador, del más reciente al más antiguo', async () => {
      // Arrange
      orderRepository.find.mockResolvedValue([]);

      // Act
      await service.findByBuyer('buyer-1');

      // Assert
      expect(orderRepository.find).toHaveBeenCalledWith({
        where: { buyerId: 'buyer-1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('No debe consultar users-service al listar los pedidos', async () => {
      // Arrange: los datos del agricultor ya quedaron guardados al crear el pedido
      orderRepository.find.mockResolvedValue([{ ...order, farmer }]);

      // Act
      await service.findByBuyer('buyer-1');

      // Assert
      expect(usersClient.getUser).not.toHaveBeenCalled();
    });
  });

  describe('findByFarmer', () => {
    it('Debe devolverle al agricultor los pedidos con los datos del comprador', async () => {
      // Arrange
      orderRepository.find.mockResolvedValue([{ ...order, buyer }]);

      // Act
      const result = await service.findByFarmer('farmer-1');

      // Assert
      expect(result[0].buyer).toEqual(buyer);
    });

    it('No debe consultar users-service al listar los pedidos recibidos', async () => {
      // Arrange: los datos del comprador ya quedaron guardados al crear el pedido
      orderRepository.find.mockResolvedValue([{ ...order, buyer }]);

      // Act
      await service.findByFarmer('farmer-1');

      // Assert
      expect(usersClient.getUser).not.toHaveBeenCalled();
    });

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

    it('No debe devolverle al agricultor el código de entrega', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...aceptado });

      // Act
      const result = await service.deliver('order-1', 'farmer-1', '482913');

      // Assert
      expect(result).not.toHaveProperty('deliveryCode');
    });

    it('Debe conservar el código de entrega en la BD al entregar', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...aceptado });

      // Act
      await service.deliver('order-1', 'farmer-1', '482913');

      // Assert
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.ENTREGADO,
          deliveryCode: '482913',
        }),
      );
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

    it('No debe devolverle al agricultor el código de entrega al aceptar', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const result = await service.changeStatus(
        'order-1',
        'farmer-1',
        OrderStatus.ACEPTADO,
      );

      // Assert
      expect(result).not.toHaveProperty('deliveryCode');
    });

    it('No debe devolverle al agricultor el código de entrega al rechazar', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const result = await service.changeStatus(
        'order-1',
        'farmer-1',
        OrderStatus.RECHAZADO,
      );

      // Assert
      expect(result).toMatchObject({ status: OrderStatus.RECHAZADO });
      expect(result).not.toHaveProperty('deliveryCode');
    });

    it('Debe devolverle al comprador el código de entrega al cancelar', async () => {
      // Arrange: el código es del comprador, él sí puede verlo
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      const result = await service.changeStatus(
        'order-1',
        'buyer-1',
        OrderStatus.CANCELADO,
      );

      // Assert
      expect(result).toMatchObject({ deliveryCode: '482913' });
    });

    it('Debe conservar el código de entrega en la BD cuando el agricultor cambia el estado', async () => {
      // Arrange
      orderRepository.findOne.mockResolvedValue({ ...order });

      // Act
      await service.changeStatus('order-1', 'farmer-1', OrderStatus.ACEPTADO);

      // Assert
      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.ACEPTADO,
          deliveryCode: '482913',
        }),
      );
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
