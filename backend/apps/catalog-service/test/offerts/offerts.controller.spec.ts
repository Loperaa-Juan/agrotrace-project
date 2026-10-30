import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard, Role, ROLES_KEY, RolesGuard } from '@app/shared';
import { OffertsController } from '../../src/offerts/offerts.controller';

describe('OffertsController', () => {
  let controller: OffertsController;
  let offertsService: any;

  // Petición de un agricultor autenticado: el guard deja el payload del token en request.user
  const request: any = { user: { sub: 'farmer-1' } };

  const dto = {
    productId: '3f2b8c1e-5d4a-4e6b-9c7d-1a2b3c4d5e6f',
    pricePerUnit: 3500,
    availableQuantity: 120,
  };

  // Foto de la fruta que sube el agricultor
  const image: any = { originalname: 'tomate.jpg' };

  beforeEach(() => {
    // El servicio falso responde con lo que recibe, así una sola aserción
    // comprueba que el controlador le pasa los datos y retorna su respuesta
    offertsService = {
      create: jest.fn((farmerId, data, file) =>
        Promise.resolve({ ...data, farmerId, imageName: file.originalname }),
      ),
      preview: jest.fn((file) =>
        Promise.resolve({ aiQuality: 'Buena', imageName: file.originalname }),
      ),
      findAll: jest.fn((productId) => Promise.resolve([{ productId }])),
      findMine: jest.fn((farmerId) => Promise.resolve([{ farmerId }])),
      update: jest.fn((offertId, farmerId, data) =>
        Promise.resolve({ OffertId: offertId, farmerId, ...data }),
      ),
      remove: jest.fn((offertId, farmerId) =>
        Promise.resolve({ OffertId: offertId, farmerId, isActive: false }),
      ),
      getActiveOffert: jest.fn((offertId) =>
        Promise.resolve({ OffertId: offertId }),
      ),
      decreaseQuantity: jest.fn((offertId, quantity) =>
        Promise.resolve(offertId === 'offert-1' && quantity === 10),
      ),
    };

    controller = new OffertsController(offertsService);
  });

  describe('create', () => {
    it('Debe crear la oferta con la foto a nombre del agricultor autenticado', async () => {
      // Arrange
      const datos = dto;

      // Act
      const result = await controller.create(request, datos, image);

      // Assert
      expect(result).toEqual({
        ...dto,
        farmerId: 'farmer-1',
        imageName: 'tomate.jpg',
      });
    });
  });

  describe('preview', () => {
    it('Debe retornar la vista previa de la foto recibida', async () => {
      // Act
      const result = await controller.preview(image);

      // Assert
      expect(result).toEqual({ aiQuality: 'Buena', imageName: 'tomate.jpg' });
    });
  });

  describe('findAll', () => {
    it('Debe listar las ofertas activas del producto recibido', async () => {
      // Arrange
      const productId = 'product-1';

      // Act
      const result = await controller.findAll(productId);

      // Assert
      expect(result).toEqual([{ productId: 'product-1' }]);
    });
  });

  describe('findMine', () => {
    it('Debe listar las ofertas del agricultor autenticado', async () => {
      // Arrange
      const peticion = request;

      // Act
      const result = await controller.findMine(peticion);

      // Assert
      expect(result).toEqual([{ farmerId: 'farmer-1' }]);
    });
  });

  describe('update', () => {
    it('Debe actualizar la oferta del id recibido a nombre del agricultor autenticado', async () => {
      // Arrange
      const cambios = { pricePerUnit: 4000 };

      // Act
      const result = await controller.update(request, 'offert-1', cambios);

      // Assert
      expect(result).toEqual({
        OffertId: 'offert-1',
        farmerId: 'farmer-1',
        pricePerUnit: 4000,
      });
    });
  });

  describe('remove', () => {
    it('Debe retirar la oferta del id recibido a nombre del agricultor autenticado', async () => {
      // Arrange
      const offertId = 'offert-1';

      // Act
      const result = await controller.remove(request, offertId);

      // Assert
      expect(result).toEqual({
        OffertId: 'offert-1',
        farmerId: 'farmer-1',
        isActive: false,
      });
    });
  });

  describe('rutas protegidas', () => {
    // Devuelve los métodos del controlador que usan JwtAuthGuard
    const metodosConGuard = (metodos: string[]) =>
      metodos.filter((metodo) =>
        (
          Reflect.getMetadata(
            GUARDS_METADATA,
            OffertsController.prototype[metodo],
          ) ?? []
        ).includes(JwtAuthGuard),
      );

    it('Las rutas del agricultor deben estar protegidas con JwtAuthGuard', () => {
      // Arrange
      const rutasDelAgricultor = [
        'create',
        'preview',
        'findMine',
        'update',
        'remove',
      ];

      // Act
      const protegidas = metodosConGuard(rutasDelAgricultor);

      // Assert
      expect(protegidas).toEqual(rutasDelAgricultor);
    });

    it('El listado de ofertas debe ser público para los compradores', () => {
      // Arrange
      const rutasPublicas = ['findAll'];

      // Act
      const protegidas = metodosConGuard(rutasPublicas);

      // Assert
      expect(protegidas).toEqual([]);
    });

    it('Las rutas del agricultor deben exigir el rol Agricultor', () => {
      // Arrange
      const rutasDelAgricultor = [
        'create',
        'preview',
        'findMine',
        'update',
        'remove',
      ];

      // Act
      const conRolAgricultor = rutasDelAgricultor.filter((metodo) => {
        const handler = OffertsController.prototype[metodo];
        const guards = Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
        const roles = Reflect.getMetadata(ROLES_KEY, handler) ?? [];
        return guards.includes(RolesGuard) && roles.includes(Role.AGRICULTOR);
      });

      // Assert
      expect(conRolAgricultor).toEqual(rutasDelAgricultor);
    });
  });

  // Patrón TCP que usa orders-service para armar un pedido
  describe('getOffert', () => {
    it('Debe responder con la oferta activa del id recibido', async () => {
      // Arrange
      const offertId = 'offert-1';

      // Act
      const result = await controller.getOffert(offertId);

      // Assert
      expect(result).toEqual({ OffertId: 'offert-1' });
    });
  });

  // Patrón TCP que usa orders-service cuando el agricultor acepta un pedido
  describe('decreaseQuantity', () => {
    it('Debe descontar de la oferta recibida la cantidad del pedido', async () => {
      // Arrange
      const payload = { offertId: 'offert-1', quantity: 10 };

      // Act
      const result = await controller.decreaseQuantity(payload);

      // Assert
      expect(result).toBe(true);
    });
  });
});
