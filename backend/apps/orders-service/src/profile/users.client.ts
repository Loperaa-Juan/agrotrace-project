import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

// Datos públicos del usuario. Vienen de users-service (sin contraseña ni tokens)
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

// Consulta por TCP los usuarios de users-service
@Injectable()
export class UsersClient {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
  ) {}

  // users-service responde null si el usuario no existe
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
