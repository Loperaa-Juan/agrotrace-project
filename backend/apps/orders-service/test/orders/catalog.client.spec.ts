import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { CatalogClient } from '../../src/orders/catalog.client';

describe('CatalogClient', () => {
  let client: CatalogClient;
  let catalogTcp: any;

  const offert = {
    OffertId: 'offert-1',
    farmerId: 'farmer-1',
    pricePerUnit: 3500,
    availableQuantity: 500,
    unitOfMeasure: 'lb',
  };

  beforeEach(() => {
    // Cliente TCP falso: responde con lo que se le indique en cada test
    catalogTcp = { send: jest.fn() };

    client = new CatalogClient(catalogTcp);
  });

  it('Debe pedir la oferta a catalog-service y devolverla', async () => {
    // Arrange: solo responde la oferta si se la piden con el patrón y el id correctos
    catalogTcp.send.mockImplementation((pattern, offertId) =>
      of(pattern === 'get_offert' && offertId === 'offert-1' ? offert : null),
    );

    // Act
    const result = await client.getOffert('offert-1');

    // Assert
    expect(result).toEqual(offert);
  });

  it('Debe lanzar NotFoundException si la oferta no existe o no está activa', async () => {
    // Arrange
    catalogTcp.send.mockReturnValue(of(null));

    // Act
    const action = client.getOffert('offert-1');

    // Assert
    await expect(action).rejects.toThrow(NotFoundException);
  });

  it('Debe lanzar ServiceUnavailableException si catalog-service no responde', async () => {
    // Arrange
    catalogTcp.send.mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    // Act
    const action = client.getOffert('offert-1');

    // Assert
    await expect(action).rejects.toThrow(ServiceUnavailableException);
  });

  describe('decreaseOffertQuantity', () => {
    it('Debe pedir a catalog-service que descuente la cantidad de la oferta', async () => {
      // Arrange: solo confirma el descuento si se lo piden con el patrón y los datos correctos
      catalogTcp.send.mockImplementation((pattern, payload) =>
        of(
          pattern === 'decrease_offert_quantity' &&
            payload.offertId === 'offert-1' &&
            payload.quantity === 10,
        ),
      );

      // Act
      const action = client.decreaseOffertQuantity('offert-1', 10);

      // Assert
      await expect(action).resolves.toBeUndefined();
    });

    it('Debe lanzar BadRequestException si la oferta ya no tiene suficiente cantidad', async () => {
      // Arrange
      catalogTcp.send.mockReturnValue(of(false));

      // Act
      const action = client.decreaseOffertQuantity('offert-1', 10);

      // Assert
      await expect(action).rejects.toThrow(BadRequestException);
    });
  });
});
