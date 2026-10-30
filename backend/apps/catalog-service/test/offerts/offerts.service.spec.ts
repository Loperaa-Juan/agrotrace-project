import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MoreThanOrEqual } from 'typeorm';
import { OffertsService } from '../../src/offerts/offerts.service';

describe('OffertsService', () => {
  let service: OffertsService;
  let offertRepository: any;
  let validationService: any;
  let catalogService: any;
  let aiClient: any;

  // Oferta de prueba que simula lo que hay en la BD
  const offert = {
    OffertId: 'offert-1',
    productId: 'product-1',
    farmerId: 'farmer-1',
    description: 'Tomate cosechado esta semana',
    pricePerUnit: 3500,
    availableQuantity: 120,
    harvestDate: '2026-10-01',
    isActive: true,
  };

  // Datos que envía el agricultor al crear una oferta (sin farmerId)
  const dto = {
    productId: 'product-1',
    pricePerUnit: 3500,
    availableQuantity: 120,
  };

  // Foto de la fruta que sube el agricultor
  const image: any = { buffer: Buffer.from('foto'), mimetype: 'image/jpeg' };

  beforeEach(() => {
    offertRepository = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    // Valida por TCP que el agricultor exista en users-service
    validationService = {
      validateUserExists: jest.fn(),
    };

    // El catálogo vive en este mismo servicio: el producto se consulta directamente
    catalogService = {
      productExists: jest.fn().mockResolvedValue(true),
    };

    // El ai-service clasifica la foto y la guarda en S3
    aiClient = {
      classify: jest.fn().mockResolvedValue({
        class: 'Fresh',
        confidence: 0.98,
        original_url:
          'https://bucket.s3.us-east-2.amazonaws.com/original/foto.jpeg',
        annotated_url:
          'https://bucket.s3.us-east-2.amazonaws.com/annotated/foto.jpeg',
      }),
    };

    service = new OffertsService(
      offertRepository,
      validationService,
      catalogService,
      aiClient,
    );
  });

  describe('create', () => {
    it('Debe guardar la oferta con el farmerId del agricultor autenticado', async () => {
      // Arrange
      const farmerId = 'farmer-1';

      // Act
      const result = await service.create(farmerId, dto, image);

      // Assert
      expect(result).toMatchObject({ ...dto, farmerId });
    });

    it('Debe guardar la calidad y la URL de la foto que devuelve la IA', async () => {
      // Arrange
      const farmerId = 'farmer-1';

      // Act
      const result = await service.create(farmerId, dto, image);

      // Assert
      expect(result).toMatchObject({
        aiQuality: 'Buena',
        imageUrl: 'https://bucket.s3.us-east-2.amazonaws.com/original/foto.jpeg',
        annotatedImageUrl:
          'https://bucket.s3.us-east-2.amazonaws.com/annotated/foto.jpeg',
      });
    });

    it('No debe guardar la oferta si la IA clasifica la fruta como podrida', async () => {
      // Arrange
      aiClient.classify.mockResolvedValue({
        class: 'Rotten',
        original_url:
          'https://bucket.s3.us-east-2.amazonaws.com/original/foto.jpeg',
      });

      // Act
      await service.create('farmer-1', dto, image).catch(() => undefined);

      // Assert
      expect(offertRepository.save).not.toHaveBeenCalled();
    });

    it('No debe llamar a la IA si el producto no existe', async () => {
      // Arrange
      catalogService.productExists.mockResolvedValue(false);

      // Act
      await service.create('farmer-1', dto, image).catch(() => undefined);

      // Assert
      expect(aiClient.classify).not.toHaveBeenCalled();
    });

    it('No debe guardar la oferta si el agricultor no existe', async () => {
      // Arrange
      validationService.validateUserExists.mockRejectedValue(
        new NotFoundException(),
      );

      // Act
      await service.create('no-existe', dto, image).catch(() => undefined);

      // Assert
      expect(offertRepository.save).not.toHaveBeenCalled();
    });

    it('Debe lanzar NotFoundException si el producto no existe o está inactivo', async () => {
      // Arrange
      catalogService.productExists.mockResolvedValue(false);

      // Act
      const action = service.create('farmer-1', dto, image);

      // Assert
      await expect(action).rejects.toThrow(NotFoundException);
    });
  });

  describe('preview', () => {
    const annotatedUrl =
      'https://bucket.s3.us-east-2.amazonaws.com/annotated/foto.jpeg';

    it('Debe retornar la calidad Buena y la foto analizada si la fruta está fresca', async () => {
      // Arrange: el ai-service clasifica la fruta como fresca
      aiClient.classify.mockResolvedValue({
        class: 'Fresh',
        confidence: 0.98,
        original_url: 'https://bucket.s3.us-east-2.amazonaws.com/o/foto.jpeg',
        annotated_url: annotatedUrl,
      });

      // Act
      const result = await service.preview(image);

      // Assert
      expect(result).toEqual({
        aiQuality: 'Buena',
        confidence: 0.98,
        annotatedImageUrl: annotatedUrl,
      });
    });

    it('Debe retornar la calidad Regular si la fruta está a medio madurar', async () => {
      // Arrange
      aiClient.classify.mockResolvedValue({
        class: 'Mild',
        confidence: 0.8,
        annotated_url: annotatedUrl,
      });

      // Act
      const result = await service.preview(image);

      // Assert
      expect(result.aiQuality).toBe('Regular');
    });

    it('Debe retornar la calidad en null, sin lanzar error, si la fruta está podrida', async () => {
      // Arrange
      aiClient.classify.mockResolvedValue({
        class: 'Rotten',
        confidence: 0.9,
        annotated_url: annotatedUrl,
      });

      // Act
      const result = await service.preview(image);

      // Assert
      expect(result).toEqual({
        aiQuality: null,
        confidence: 0.9,
        annotatedImageUrl: annotatedUrl,
      });
    });

    it('No debe guardar ninguna oferta', async () => {
      // Act
      await service.preview(image);

      // Assert
      expect(offertRepository.save).not.toHaveBeenCalled();
    });

    it('Debe propagar el error si el ai-service no responde', async () => {
      // Arrange
      aiClient.classify.mockRejectedValue(new Error('ai-service no responde'));

      // Act
      const action = service.preview(image);

      // Assert
      await expect(action).rejects.toThrow('ai-service no responde');
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

  // Usado por orders-service (TCP) para armar un pedido
  describe('getActiveOffert', () => {
    it('Debe buscar solo ofertas activas de productos activos', async () => {
      // Arrange
      offertRepository.findOne.mockResolvedValue(null);

      // Act
      await service.getActiveOffert('offert-1');

      // Assert
      expect(offertRepository.findOne).toHaveBeenCalledWith({
        where: {
          OffertId: 'offert-1',
          isActive: true,
          product: { isActive: true },
        },
        relations: { product: true },
      });
    });

    it('Debe devolver los datos de la oferta con la unidad de medida del producto', async () => {
      // Arrange
      offertRepository.findOne.mockResolvedValue({
        ...offert,
        product: { unitOfMeasure: 'kg' },
      });

      // Act
      const result = await service.getActiveOffert('offert-1');

      // Assert
      expect(result).toEqual({
        OffertId: 'offert-1',
        farmerId: 'farmer-1',
        pricePerUnit: 3500,
        availableQuantity: 120,
        unitOfMeasure: 'kg',
      });
    });
  });

  // Usado por orders-service (TCP) cuando el agricultor acepta un pedido
  describe('decreaseQuantity', () => {
    it('Debe descontar la cantidad solo si la oferta activa tiene suficiente', async () => {
      // Arrange
      const cantidad = 10;

      // Act
      await service.decreaseQuantity('offert-1', cantidad);

      // Assert: la condición va en el UPDATE para que dos pedidos a la vez no dejen la cantidad negativa
      expect(offertRepository.update).toHaveBeenCalledWith(
        {
          OffertId: 'offert-1',
          isActive: true,
          availableQuantity: MoreThanOrEqual(10),
        },
        { availableQuantity: expect.any(Function) },
      );
    });

    it('Debe responder false si no alcanza la cantidad disponible', async () => {
      // Arrange
      offertRepository.update.mockResolvedValue({ affected: 0 });

      // Act
      const result = await service.decreaseQuantity('offert-1', 1000);

      // Assert
      expect(result).toBe(false);
    });

    it('Debe retirar la oferta cuando se agota', async () => {
      // Arrange
      const cantidad = 10;

      // Act
      await service.decreaseQuantity('offert-1', cantidad);

      // Assert
      expect(offertRepository.update).toHaveBeenCalledWith(
        { OffertId: 'offert-1', availableQuantity: 0 },
        { isActive: false },
      );
    });
  });
});
