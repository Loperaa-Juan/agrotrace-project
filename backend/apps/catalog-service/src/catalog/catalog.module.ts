import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Product } from '../entities/product.entitie';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [CatalogController],
  providers: [CatalogService],
  // OffertsModule lo usa para validar el producto de una oferta
  exports: [CatalogService],
})
export class CatalogModule {}
