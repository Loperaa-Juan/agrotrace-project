import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
