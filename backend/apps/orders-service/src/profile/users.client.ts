import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

/**
 * Resumen de los datos públicos del usuario obtenidos desde users-service.
 */
export interface UserSummary {
  userId: string;
  name: string;
  email: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  address: string;
  municipality: string;
  role: string;
}

/**
 * Cliente TCP para consultar la información de los usuarios directamente en users-service.
 */
@Injectable()
export class UsersClient {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
  ) {}

  /**
   * Consulta los datos de un usuario por su ID vía TCP.
   * @param userId - ID del usuario.
   * @returns Datos públicos del usuario.
   * @throws `ServiceUnavailableException` Si users-service no responde.
   * @throws `NotFoundException` Si el usuario no existe.
   */
  async getUser(userId: string): Promise<UserSummary> {
    let user: UserSummary | null;
    try {
      user = await firstValueFrom(
        this.usersClient.send<UserSummary | null>('get_user_by_id', {
          userId,
        }),
      );
    } catch {
      throw new ServiceUnavailableException('Users service is unavailable');
    }
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
