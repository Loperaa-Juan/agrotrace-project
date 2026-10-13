import { ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogService } from '../../src/catalog/catalog.service';
import {
  ProductCategory,
  UnitOfMeasure,
} from '../../src/entities/product.entitie';

describe('CatalogService', () => {
  let service: CatalogService;
  let productRepository: any;

  // Producto de prueba que simula lo que hay en la BD
  const product = {
    ProductId: 'product-1',
    name: 'Tomate chonto',
    category: ProductCategory.HORTALIZAS,
    unitOfMeasure: UnitOfMeasure.LIBRA,
    description: 'Tomate rojo para ensalada',
    isActive: true,
  };

  beforeEach(() => {
    productRepository = {
      existsBy: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    service = new CatalogService(productRepository);
  });

  describe('create', () => {
    it('Debe guardar el producto en el catálogo', async () => {
      productRepository.existsBy.mockResolvedValue(false);

      const result = await service.create({
        name: 'Tomate chonto',
        category: ProductCategory.HORTALIZAS,
        unitOfMeasure: UnitOfMeasure.LIBRA,
        description: 'Tomate rojo para ensalada',
      });

      expect(result).toEqual({
        name: 'Tomate chonto',
        category: ProductCategory.HORTALIZAS,
        unitOfMeasure: UnitOfMeasure.LIBRA,
        description: 'Tomate rojo para ensalada',
      });
    });

    it('Debe lanzar ConflictException si ya existe un producto con ese nombre', async () => {
      productRepository.existsBy.mockResolvedValue(true);

      await expect(
        service.create({
          name: 'Tomate chonto',
          category: ProductCategory.HORTALIZAS,
          unitOfMeasure: UnitOfMeasure.LIBRA,
          description: 'Tomate rojo para ensalada',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('Debe consultar solo los productos activos ordenados por nombre', async () => {
      productRepository.find.mockResolvedValue([product]);

      await service.findAll();

      expect(productRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('Debe retornar el producto si existe', async () => {
      productRepository.findOne.mockResolvedValue(product);

      const result = await service.findOne('product-1');

      expect(result).toEqual(product);
    });

    it('Debe lanzar NotFoundException si el producto no existe', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('Debe guardar los cambios del producto', async () => {
      productRepository.findOne.mockResolvedValue({ ...product });

      const result = await service.update('product-1', {
        unitOfMeasure: UnitOfMeasure.KILOGRAMO,
      });

      expect(result).toEqual({
        ...product,
        unitOfMeasure: UnitOfMeasure.KILOGRAMO,
      });
    });
  });

  describe('remove', () => {
    it('Debe desactivar el producto en lugar de borrarlo (borrado lógico)', async () => {
      productRepository.findOne.mockResolvedValue({ ...product });

      const result = await service.remove('product-1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('productExists', () => {
    it('Debe consultar solo productos activos', async () => {
      // Arrange
      productRepository.existsBy.mockResolvedValue(true);

      // Act
      await service.productExists('product-1');

      // Assert
      expect(productRepository.existsBy).toHaveBeenCalledWith({
        ProductId: 'product-1',
        isActive: true,
      });
    });
  });
});
