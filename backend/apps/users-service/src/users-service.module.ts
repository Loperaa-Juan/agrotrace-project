import { Module } from '@nestjs/common';
import { UsersServiceController } from './users-service.controller';
import { UsersServiceService } from './users-service.service';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [UsersServiceController],
  providers: [UsersServiceService, AuthService],
})
export class UsersServiceModule {}
