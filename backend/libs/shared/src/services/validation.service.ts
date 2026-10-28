import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

/**
 * Servicio compartido para validar datos contra otros microservicios por TCP.
 */
@Injectable()
export class ValidationService {
  /**
   * @param usersClient - Cliente TCP de users-service (token `USERS_SERVICE`).
   */
  constructor(
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
  ) {}

  /**
   * Verifica en users-service (patrón `user_exists`) que el usuario exista antes de operar con él.
   * @param userId - UUID del usuario a validar.
   * @returns Se resuelve si el usuario existe.
   * @throws `BadRequestException` Si no se envía `userId`.
   * @throws `ServiceUnavailableException` Si users-service no responde.
   * @throws `NotFoundException` Si el usuario no existe.
   */
  async validateUserExists(userId: string): Promise<void> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    let exists: boolean;
    try {
      exists = await firstValueFrom(
        this.usersClient.send<boolean>('user_exists', userId),
      );
    } catch {
      throw new ServiceUnavailableException('Users service is unavailable');
    }

    if (!exists) {
      throw new NotFoundException('User not found');
    }
  }
}
