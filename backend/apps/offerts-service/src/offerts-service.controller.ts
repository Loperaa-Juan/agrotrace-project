import { Controller, Get } from '@nestjs/common';
import { OffertsServiceService } from './offerts-service.service';

@Controller()
export class OffertsServiceController {
  constructor(private readonly offertsServiceService: OffertsServiceService) {}

  @Get()
  getHello(): string {
    return this.offertsServiceService.getHello();
  }
}
