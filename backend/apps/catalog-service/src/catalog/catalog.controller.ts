import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '../entities/product.entitie';

// Consultar el catálogo es público; solo un Admin puede crear, editar o eliminar productos
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return await this.catalogService.create(dto);
  }

  @Get()
  async findAll(): Promise<Product[]> {
    return await this.catalogService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.findOne(productId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return await this.catalogService.update(productId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.remove(productId);
  }
}
