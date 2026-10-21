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

/**
 * Controlador HTTP encargado de exponer los endpoints del catálogo maestro.
 * La consulta de productos es pública; las acciones de creación, edición y borrado lógico están restringidas al rol ADMIN.
 */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Endpoint protegido (solo ADMIN) para crear un nuevo producto en el catálogo.
   * @param {CreateProductDto} dto - Datos de creación del producto.
   * @returns {Promise<Product>} El producto creado.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return await this.catalogService.create(dto);
  }

  /**
   * Endpoint público para listar todos los productos activos del catálogo.
   * @returns {Promise<Product[]>} Lista de productos activos.
   */
  @Get()
  async findAll(): Promise<Product[]> {
    return await this.catalogService.findAll();
  }

  /**
   * Endpoint público para consultar el detalle de un producto específico mediante su ID.
   * @param {string} productId - Identificador UUID del producto.
   * @returns {Promise<Product>} El producto encontrado.
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.findOne(productId);
  }

  /**
   * Endpoint protegido (solo ADMIN) para actualizar la información de un producto.
   * @param {string} productId - Identificador UUID del producto.
   * @param {UpdateProductDto} dto - Datos a modificar.
   * @returns {Promise<Product>} El producto actualizado.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return await this.catalogService.update(productId, dto);
  }

  /**
   * Endpoint protegido (solo ADMIN) para realizar el borrado lógico de un producto.
   * @param {string} productId - Identificador UUID del producto.
   * @returns {Promise<Product>} El producto marcado como inactivo.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.remove(productId);
  }
}
