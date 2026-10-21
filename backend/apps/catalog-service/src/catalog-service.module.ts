import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { CatalogServiceController } from './catalog-service.controller';
import { CatalogServiceService } from './catalog-service.service';
import { CatalogModule } from './catalog/catalog.module';
import { OffertsModule } from './offerts/offerts.module';
import { Product } from './entities/product.entitie';
import { Offert } from './entities/offert.entity';

/**
 * Módulo raíz de catalog-service (`CatalogServiceModule`).
 * Configura la conexión global a PostgreSQL, las variables de entorno, la validación global de tokens JWT 
 * e importa los sub-módulos del catálogo y las ofertas.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number.parseInt(process.env.DATABASE_PORT as string) || 5432,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [Product, Offert],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    // Solo verifica tokens (JwtAuthGuard); los emite users-service con el mismo JWT_SECRET
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
      global: true,
    }),
    CatalogModule,
    OffertsModule,
  ],
  controllers: [CatalogServiceController],
  providers: [CatalogServiceService],
})
export class CatalogServiceModule {}
