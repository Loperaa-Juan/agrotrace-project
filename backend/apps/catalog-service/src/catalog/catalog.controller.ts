import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '../entities/product.entitie';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post()
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
  async update(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return await this.catalogService.update(productId, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.remove(productId);
  }
}
