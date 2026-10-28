import {
  applyDecorators,
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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { CatalogService } from './catalog.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from '../entities/product.entitie';

/** Documentación del parámetro :id que comparten las rutas de un producto. */
const productIdParam = ApiParam({
  name: 'id',
  format: 'uuid',
  description: 'Id del producto',
});

/** Documentación común de las rutas solo para Admin: piden token y pueden responder 401 o 403. */
const adminOnlyDocs = applyDecorators(
  ApiBearerAuth(),
  ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' }),
  ApiForbiddenResponse({ description: 'El usuario no tiene el rol Admin' }),
);

/**
 * Controlador HTTP encargado de exponer los endpoints del catálogo maestro.
 * La consulta de productos es pública; las acciones de creación, edición y borrado lógico están restringidas al rol ADMIN.
 */
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Endpoint protegido (solo ADMIN) para crear un nuevo producto en el catálogo.
   * @param dto - Datos de creación del producto.
   * @returns El producto creado.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un producto (solo Admin)' })
  @adminOnlyDocs
  @ApiCreatedResponse({ description: 'Producto creado', type: Product })
  @ApiBadRequestResponse({
    description: 'Los datos del producto no son válidos',
  })
  @ApiConflictResponse({ description: 'Ya existe un producto con ese nombre' })
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return await this.catalogService.create(dto);
  }

  /**
   * Endpoint público para listar todos los productos activos del catálogo.
   * @returns Lista de productos activos.
   */
  @Get()
  @ApiOperation({ summary: 'Listar los productos activos' })
  @ApiOkResponse({
    description: 'Productos activos ordenados por nombre',
    type: [Product],
  })
  async findAll(): Promise<Product[]> {
    return await this.catalogService.findAll();
  }

  /**
   * Endpoint público para consultar el detalle de un producto específico mediante su ID.
   * @param productId - Identificador UUID del producto.
   * @returns El producto encontrado.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Ver un producto' })
  @productIdParam
  @ApiOkResponse({ description: 'Producto encontrado', type: Product })
  @ApiBadRequestResponse({ description: 'El id no es un UUID' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async findOne(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.findOne(productId);
  }

  /**
   * Endpoint protegido (solo ADMIN) para actualizar la información de un producto.
   * @param productId - Identificador UUID del producto.
   * @param dto - Datos a modificar.
   * @returns El producto actualizado.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un producto (solo Admin)' })
  @adminOnlyDocs
  @productIdParam
  @ApiOkResponse({ description: 'Producto actualizado', type: Product })
  @ApiBadRequestResponse({
    description: 'El id no es un UUID o los datos no son válidos',
  })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async update(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return await this.catalogService.update(productId, dto);
  }

  /**
   * Endpoint protegido (solo ADMIN) para realizar el borrado lógico de un producto.
   * @param productId - Identificador UUID del producto.
   * @returns El producto marcado como inactivo.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Retirar un producto del catálogo (solo Admin)' })
  @adminOnlyDocs
  @productIdParam
  @ApiOkResponse({
    description: 'Producto retirado (queda con isActive en false)',
    type: Product,
  })
  @ApiBadRequestResponse({ description: 'El id no es un UUID' })
  @ApiNotFoundResponse({ description: 'El producto no existe' })
  async remove(
    @Param('id', ParseUUIDPipe) productId: string,
  ): Promise<Product> {
    return await this.catalogService.remove(productId);
  }
}
