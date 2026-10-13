import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@app/shared';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() request) {
    const user = await this.usersService.getUserById(request.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Req() request) {
    await this.usersService.deleteUser(request.user.sub);
  }

  @MessagePattern('get_users')
  async getAllUsers(@Payload() data: { page?: number; limit?: number }) {
    const { page = 1, limit = 10 } = data;

    return await this.usersService.getUsers(page, limit);
  }

  @MessagePattern('get_user_by_id')
  async getUserById(@Payload() data: { userId: string }) {
    return await this.usersService.getUserById(data.userId);
  }

  @MessagePattern('get_current_user')
  async getCurrentUser(@Payload() data: { userId: string }) {
    return await this.usersService.getUserById(data.userId);
  }

  @MessagePattern('user_exists')
  async userExists(@Payload() userId: string) {
    return await this.usersService.userExists(userId);
  }
}
