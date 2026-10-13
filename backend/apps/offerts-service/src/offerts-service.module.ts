import { Module } from '@nestjs/common';
import { OffertsServiceController } from './offerts-service.controller';
import { OffertsServiceService } from './offerts-service.service';

@Module({
  imports: [],
  controllers: [OffertsServiceController],
  providers: [OffertsServiceService],
})
export class OffertsServiceModule {}
