import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

/**
 * Interfaz que define los datos públicos de un usuario (provenientes de users-service).
 * No incluye contraseñas ni tokens por seguridad.
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
 * Cliente de comunicación por TCP encargado de consultar la información de los usuarios
 * directamente al microservicio de usuarios (`users-service`).
 */
@Injectable()
export class UsersClient {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
  ) {}

  /**
   * Consulta los datos de un usuario por TCP en users-service utilizando su ID.
   * @param {string} userId - Identificador único del usuario.
   * @returns {Promise<UserSummary>} Resumen con los datos públicos del usuario.
   * @throws {ServiceUnavailableException} Si el servicio de usuarios no responde.
   * @throws {NotFoundException} Si users-service responde null (el usuario no existe).
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
