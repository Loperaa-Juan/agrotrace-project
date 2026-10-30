import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { OffertsService, OffertSummary } from './offerts.service';
import { CreateOffertDto } from './dto/create-offert.dto';
import { UpdateOffertDto } from './dto/update-offert.dto';
import { OffertPreview } from './dto/offert-preview.dto';
import { Offert } from '../entities/offert.entity';

/** Documentación del parámetro :id que comparten las rutas de una oferta. */
const offertIdParam = ApiParam({
  name: 'id',
  format: 'uuid',
  description: 'Id de la oferta',
});

/**
 * Documentación común de las rutas solo para Agricultor: piden token y pueden responder 401 o 403.
 * @param forbidden - Cuándo responde 403 la ruta.
 */
const farmerOnlyDocs = (forbidden = 'El usuario no tiene el rol Agricultor') =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' }),
    ApiForbiddenResponse({ description: forbidden }),
  );

/** Tamaño máximo de la foto de la fruta (el mismo límite que valida el ai-service). */
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Valida la foto de la fruta que llega en el campo `image` (tamaño y tipo declarado). */
const imagePipe = () =>
  new ParseFilePipe({
    validators: [
      new MaxFileSizeValidator({ maxSize: MAX_IMAGE_BYTES }),
      // Solo el mimetype declarado: el ai-service valida el contenido real del archivo
      new FileTypeValidator({
        fileType: /image\/(jpeg|png|webp)/,
        skipMagicNumbersValidation: true,
      }),
    ],
  });

/** Respuesta 403 de las rutas que modifican una oferta ya publicada. */
const notOwnerForbidden =
  'El usuario no tiene el rol Agricultor o la oferta es de otro agricultor';

/**
 * Controlador encargado de gestionar los endpoints HTTP y los canales de comunicación TCP para las ofertas.
 * El ID del agricultor se extrae siempre de forma segura del token de sesión (request.user.sub).
 */
@Controller('offerts')
export class OffertsController {
  constructor(private readonly offertsService: OffertsService) {}

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para publicar una nueva oferta.
   * @param request - Objeto request con la información del token.
   * @param dto - Datos de la oferta a crear.
   * @param image - Foto de la fruta (campo `image` del multipart).
   * @returns La oferta creada.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Publicar una oferta (solo Agricultor)' })
  @ApiConsumes('multipart/form-data')
  @ApiExtraModels(CreateOffertDto)
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(CreateOffertDto) },
        {
          type: 'object',
          required: ['image'],
          properties: {
            image: {
              type: 'string',
              format: 'binary',
              description: 'Foto de la fruta (jpeg, png o webp, máximo 6 MB)',
            },
          },
        },
      ],
    },
  })
  @farmerOnlyDocs()
  @ApiCreatedResponse({ description: 'Oferta publicada', type: Offert })
  @ApiBadRequestResponse({
    description:
      'Los datos no son válidos, falta la imagen, no se detectó fruta o la fruta está en mal estado',
  })
  @ApiNotFoundResponse({
    description:
      'El producto no existe o fue retirado, o el agricultor no existe',
  })
  @ApiServiceUnavailableResponse({
    description:
      'users-service (valida al agricultor) o ai-service (clasifica la foto) no responde',
  })
  async create(
    @Req() request,
    @Body() dto: CreateOffertDto,
    @UploadedFile(imagePipe())
    image: Express.Multer.File,
  ): Promise<Offert> {
    return await this.offertsService.create(request.user.sub, dto, image);
  }

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para revisar la calificación de la IA antes de publicar.
   * Clasifica la foto sin crear la oferta.
   * @param image - Foto de la fruta (campo `image` del multipart).
   * @returns La calidad asignada (null si está en mal estado) y la foto analizada.
   */
  @Post('preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Ver la calificación de la IA antes de publicar (solo Agricultor)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Foto de la fruta (jpeg, png o webp, máximo 6 MB)',
        },
      },
    },
  })
  @farmerOnlyDocs()
  @ApiOkResponse({
    description:
      'Calificación de la IA. aiQuality es null si la fruta está en mal estado',
    type: OffertPreview,
  })
  @ApiBadRequestResponse({
    description: 'Falta la imagen o no es válida, o no se detectó fruta',
  })
  @ApiServiceUnavailableResponse({
    description: 'ai-service (clasifica la foto) no responde',
  })
  @HttpCode(HttpStatus.OK)
  async preview(
    @UploadedFile(imagePipe()) image: Express.Multer.File,
  ): Promise<OffertPreview> {
    return await this.offertsService.preview(image);
  }

  /**
   * Endpoint público para listar ofertas activas, permitiendo filtrar opcionalmente por producto.
   * @param productId - ID opcional del producto.
   * @returns Lista de ofertas activas.
   */
  @Get()
  @ApiOperation({ summary: 'Listar las ofertas activas' })
  @ApiQuery({
    name: 'productId',
    required: false,
    format: 'uuid',
    description: 'Muestra solo las ofertas de este producto',
  })
  @ApiOkResponse({
    description: 'Ofertas activas, de la más nueva a la más vieja',
    type: [Offert],
  })
  @ApiBadRequestResponse({ description: 'productId no es un UUID' })
  async findAll(
    @Query('productId', new ParseUUIDPipe({ optional: true }))
    productId?: string,
  ): Promise<Offert[]> {
    return await this.offertsService.findAll(productId);
  }

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para consultar las ofertas propias (incluyendo retiradas).
   * @param request - Objeto request del agricultor autenticado.
   * @returns Lista de ofertas propias.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  @ApiOperation({
    summary: 'Ver mis ofertas, incluidas las retiradas (solo Agricultor)',
  })
  @farmerOnlyDocs()
  @ApiOkResponse({
    description: 'Mis ofertas, de la más nueva a la más vieja',
    type: [Offert],
  })
  async findMine(@Req() request): Promise<Offert[]> {
    return await this.offertsService.findMine(request.user.sub);
  }

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para modificar una oferta propia.
   * @param request - Objeto request del agricultor.
   * @param offertId - ID de la oferta en formato UUID.
   * @param dto - Datos a actualizar.
   * @returns La oferta actualizada.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  @ApiOperation({ summary: 'Actualizar una oferta propia (solo Agricultor)' })
  @farmerOnlyDocs(notOwnerForbidden)
  @offertIdParam
  @ApiOkResponse({ description: 'Oferta actualizada', type: Offert })
  @ApiBadRequestResponse({
    description: 'El id no es un UUID o los datos no son válidos',
  })
  @ApiNotFoundResponse({ description: 'La oferta no existe' })
  async update(
    @Req() request,
    @Param('id', ParseUUIDPipe) offertId: string,
    @Body() dto: UpdateOffertDto,
  ): Promise<Offert> {
    return await this.offertsService.update(offertId, request.user.sub, dto);
  }

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para retirar una oferta propia (borrado lógico).
   * @param request - Objeto request del agricultor.
   * @param offertId - ID de la oferta en formato UUID.
   * @returns La oferta con su estado inactivo guardado.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  @ApiOperation({ summary: 'Retirar una oferta propia (solo Agricultor)' })
  @farmerOnlyDocs(notOwnerForbidden)
  @offertIdParam
  @ApiOkResponse({
    description: 'Oferta retirada (queda con isActive en false)',
    type: Offert,
  })
  @ApiBadRequestResponse({ description: 'El id no es un UUID' })
  @ApiNotFoundResponse({ description: 'La oferta no existe' })
  async remove(
    @Req() request,
    @Param('id', ParseUUIDPipe) offertId: string,
  ): Promise<Offert> {
    return await this.offertsService.remove(offertId, request.user.sub);
  }

  /**
   * Patrón de mensaje TCP consumido por orders-service para consultar y validar una oferta.
   * @param offertId - Identificador único de la oferta.
   * @returns Resumen de la oferta o null.
   */
  @MessagePattern('get_offert')
  async getOffert(@Payload() offertId: string): Promise<OffertSummary | null> {
    return await this.offertsService.getActiveOffert(offertId);
  }

  /**
   * Patrón de mensaje TCP consumido por orders-service cuando el agricultor acepta un pedido y se requiere descontar inventario.
   * @param payload - Objeto que contiene el ID de la oferta y la cantidad a descontar.
   * @returns True si el descuento fue exitoso, false si falló por falta de stock.
   */
  @MessagePattern('decrease_offert_quantity')
  async decreaseQuantity(
    @Payload() payload: { offertId: string; quantity: number },
  ): Promise<boolean> {
    return await this.offertsService.decreaseQuantity(
      payload.offertId,
      payload.quantity,
    );
  }
}
