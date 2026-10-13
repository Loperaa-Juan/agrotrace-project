import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OffertsService } from '../../src/offerts/offerts.service';

describe('OffertsService', () => {
  let service: OffertsService;
  let offertRepository: any;
  let validationService: any;
  let catalogService: any;

  // Oferta de prueba que simula lo que hay en la BD
  const offert = {
    OffertId: 'offert-1',
    productId: 'product-1',
    farmerId: 'farmer-1',
    description: 'Tomate cosechado esta semana',
    pricePerUnit: 3500,
    availableQuantity: 120,
    harvestDate: '2026-10-01',
    municipality: 'Envigado',
    isActive: true,
  };

  // Datos que envía el agricultor al crear una oferta (sin farmerId)
  const dto = {
    productId: 'product-1',
    pricePerUnit: 3500,
    availableQuantity: 120,
    municipality: 'Envigado',
  };

  beforeEach(() => {
    offertRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    // Valida por TCP que el agricultor exista en users-service
    validationService = {
      validateUserExists: jest.fn(),
    };

    // El catálogo vive en este mismo servicio: el producto se consulta directamente
    catalogService = {
      productExists: jest.fn().mockResolvedValue(true),
    };

    service = new OffertsService(
      offertRepository,
      validationService,
      catalogService,
    );
  });

  describe('create', () => {
    it('Debe guardar la oferta con el farmerId del agricultor autenticado', async () => {
      // Arrange
      const farmerId = 'farmer-1';

      // Act
      const result = await service.create(farmerId, dto);

      // Assert
      expect(result).toEqual({ ...dto, farmerId });
    });

    it('No debe guardar la oferta si el agricultor no existe', async () => {
      // Arrange
      validationService.validateUserExists.mockRejectedValue(
        new NotFoundException(),
      );

      // Act
      await service.create('no-existe', dto).catch(() => undefined);

      // Assert
      expect(offertRepository.save).not.toHaveBeenCalled();
    });

    it('Debe lanzar NotFoundException si el producto no existe o está inactivo', async () => {
      // Arrange
      catalogService.productExists.mockResolvedValue(false);

      // Act
      const action = service.create('farmer-1', dto);

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('Debe consultar solo las ofertas activas', async () => {
      // Arrange
      offertRepository.find.mockResolvedValue([offert]);

      // Act
      await service.findAll();

      // Assert
      expect(offertRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('Debe filtrar las ofertas activas por producto', async () => {
      // Arrange
      offertRepository.find.mockResolvedValue([offert]);

      // Act
      await service.findAll('product-1');

      // Assert
      expect(offertRepository.find).toHaveBeenCalledWith({
        where: { isActive: true, productId: 'product-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findMine', () => {
    it('Debe consultar todas las ofertas del agricultor', async () => {
      // Arrange
      offertRepository.find.mockResolvedValue([offert]);

      // Act
      await service.findMine('farmer-1');

      // Assert
      expect(offertRepository.find).toHaveBeenCalledWith({
        where: { farmerId: 'farmer-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('update', () => {
    it('Debe guardar los cambios si el agricultor es el dueño de la oferta', async () => {
      // Arrange
      offertRepository.findOne.mockResolvedValue({ ...offert });

      // Act
      const result = await service.update('offert-1', 'farmer-1', {
        pricePerUnit: 4000,
      });

      // Assert
      expect(result).toEqual({ ...offert, pricePerUnit: 4000 });
    });

    it('Debe lanzar NotFoundException si la oferta no existe', async () => {
      // Arrange
      offertRepository.findOne.mockResolvedValue(null);

      // Act
      const action = service.update('no-existe', 'farmer-1', {
        pricePerUnit: 4000,
      });

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });

    it('Debe lanzar ForbiddenException si la oferta es de otro agricultor', async () => {
      // Arrange
      offertRepository.findOne.mockResolvedValue({ ...offert });

      // Act
      const action = service.update('offert-1', 'otro-agricultor', {
        pricePerUnit: 4000,
      });

      // Assert
      await expect(action).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('Debe desactivar la oferta en lugar de borrarla (borrado lógico)', async () => {
      // Arrange
      offertRepository.findOne.mockResolvedValue({ ...offert });

      // Act
      const result = await service.remove('offert-1', 'farmer-1');

      // Assert
      expect(result.isActive).toBe(false);
    });
  });
});
