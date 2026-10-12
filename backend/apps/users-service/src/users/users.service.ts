import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthUserDto, toAuthUserDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUsers(page = 1, limit = 10) {
    const [users, usersCount] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users.map(toAuthUserDto),
      meta: {
        total: usersCount,
        page,
        limit,
        totalPages: Math.ceil(usersCount / limit),
      },
    };
  }

  async getUserById(id: string): Promise<AuthUserDto | null> {
    const user = await this.userRepository.findOne({
      where: { userId: id },
    });
    return user ? toAuthUserDto(user) : null;
  }

  async userExists(id: string): Promise<boolean> {
    return this.userRepository.exists({ where: { userId: id } });
  }
}
