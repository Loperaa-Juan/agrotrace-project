import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedModule } from '@app/shared';
import { OffertsController } from './offerts.controller';
import { OffertsService } from './offerts.service';
import { Offert } from '../entities/offert.entity';
import { CatalogModule } from '../catalog/catalog.module';

/**
 * Módulo de ofertas (`OffertsModule`).
 * Agrupa la entidad Offert, dependencias compartidas (`SharedModule`) y el módulo de catálogo.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Offert]), SharedModule, CatalogModule],
  controllers: [OffertsController],
  providers: [OffertsService],
})
export class OffertsModule {}
