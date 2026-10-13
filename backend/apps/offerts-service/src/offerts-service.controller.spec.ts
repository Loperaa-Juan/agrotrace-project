import { Test, TestingModule } from '@nestjs/testing';
import { OffertsServiceController } from './offerts-service.controller';
import { OffertsServiceService } from './offerts-service.service';

describe('OffertsServiceController', () => {
  let offertsServiceController: OffertsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [OffertsServiceController],
      providers: [OffertsServiceService],
    }).compile();

    offertsServiceController = app.get<OffertsServiceController>(OffertsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(offertsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
