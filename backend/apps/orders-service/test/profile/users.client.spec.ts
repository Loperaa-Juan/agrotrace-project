import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { UsersClient } from '../../src/profile/users.client';

describe('UsersClient', () => {
  let client: UsersClient;
  let usersTcp: any;

  // Usuario tal como lo devuelve users-service (sin contraseña)
  const user = {
    userId: 'farmer-1',
    name: 'Juan',
    email: 'juan@agrotrace.com',
    role: 'Agricultor',
  };

  beforeEach(() => {
    // Cliente TCP falso: responde con lo que se le indique en cada test
    usersTcp = { send: jest.fn() };

    client = new UsersClient(usersTcp);
  });

  it('Debe pedir el usuario a users-service y devolverlo', async () => {
    // Arrange: solo responde el usuario si se lo piden con el patrón y el id correctos
    usersTcp.send.mockImplementation((pattern, payload) =>
      of(
        pattern === 'get_user_by_id' && payload.userId === 'farmer-1'
          ? user
          : null,
      ),
    );

    // Act
    const result = await client.getUser('farmer-1');

    // Assert
    expect(result).toEqual(user);
  });

  it('Debe lanzar NotFoundException si el usuario no existe', async () => {
    // Arrange
    usersTcp.send.mockReturnValue(of(null));

    // Act
    const action = client.getUser('farmer-1');

    // Assert
    await expect(action).rejects.toThrow(NotFoundException);
  });

  it('Debe lanzar ServiceUnavailableException si users-service no responde', async () => {
    // Arrange
    usersTcp.send.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

    // Act
    const action = client.getUser('farmer-1');

    // Assert
    await expect(action).rejects.toThrow(ServiceUnavailableException);
  });
});
