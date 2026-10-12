import { CatalogController } from '../../src/catalog/catalog.controller';
import {
  ProductCategory,
  UnitOfMeasure,
} from '../../src/entities/product.entitie';

describe('CatalogController', () => {
  let controller: CatalogController;
  let catalogService: any;

  // Producto de prueba tal como lo retorna el servicio
  const product = {
    ProductId: 'product-1',
    name: 'Tomate chonto',
    category: ProductCategory.HORTALIZAS,
    unitOfMeasure: UnitOfMeasure.LIBRA,
    isActive: true,
  };

  beforeEach(() => {
    // El servicio falso responde con lo que recibe, así una sola aserción
    // comprueba que el controlador le pasa los datos y retorna su respuesta
    catalogService = {
      create: jest.fn((dto) =>
        Promise.resolve({ ProductId: 'product-1', ...dto }),
      ),
      findAll: jest.fn(() => Promise.resolve([product])),
      findOne: jest.fn((id) => Promise.resolve({ ...product, ProductId: id })),
      update: jest.fn((id, dto) =>
        Promise.resolve({ ...product, ProductId: id, ...dto }),
      ),
      remove: jest.fn((id) =>
        Promise.resolve({ ...product, ProductId: id, isActive: false }),
      ),
    };

    controller = new CatalogController(catalogService);
  });

  describe('create', () => {
    it('Debe crear el producto con los datos recibidos', async () => {
      const dto = {
        name: 'Tomate chonto',
        category: ProductCategory.HORTALIZAS,
        unitOfMeasure: UnitOfMeasure.LIBRA,
        description: 'Tomate rojo para ensalada',
      };

      const result = await controller.create(dto);

      expect(result).toEqual({ ProductId: 'product-1', ...dto });
    });
  });

  describe('findAll', () => {
    it('Debe retornar los productos del catálogo', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([product]);
    });
  });

  describe('findOne', () => {
    it('Debe retornar el producto del id recibido', async () => {
      const result = await controller.findOne('product-2');

      expect(result.ProductId).toBe('product-2');
    });
  });

  describe('update', () => {
    it('Debe actualizar el producto del id recibido con los cambios', async () => {
      const result = await controller.update('product-2', {
        unitOfMeasure: UnitOfMeasure.KILOGRAMO,
      });

      expect(result).toEqual({
        ...product,
        ProductId: 'product-2',
        unitOfMeasure: UnitOfMeasure.KILOGRAMO,
      });
    });
  });

  describe('remove', () => {
    it('Debe desactivar el producto del id recibido', async () => {
      const result = await controller.remove('product-2');

      expect(result).toEqual({
        ...product,
        ProductId: 'product-2',
        isActive: false,
      });
    });
  });
});
