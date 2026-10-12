import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ValidationService {
  constructor(
    @Inject('USERS_SERVICE') private readonly usersClient: ClientProxy,
  ) {}

  // Verifica en users-service que el usuario exista antes de operar con él
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
