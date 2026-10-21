import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { OffertsService, OffertSummary } from './offerts.service';
import { CreateOffertDto } from './dto/create-offert.dto';
import { UpdateOffertDto } from './dto/update-offert.dto';
import { Offert } from '../entities/offert.entity';

/**
 * Controlador encargado de gestionar los endpoints HTTP y los canales de comunicación TCP para las ofertas.
 * El ID del agricultor se extrae siempre de forma segura del token de sesión (request.user.sub).
 */
@Controller('offerts')
export class OffertsController {
  constructor(private readonly offertsService: OffertsService) {}

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para publicar una nueva oferta.
   * @param {any} request - Objeto request con la información del token.
   * @param {CreateOffertDto} dto - Datos de la oferta a crear.
   * @returns {Promise<Offert>} La oferta creada.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async create(@Req() request, @Body() dto: CreateOffertDto): Promise<Offert> {
    return await this.offertsService.create(request.user.sub, dto);
  }

  /**
   * Endpoint público para listar ofertas activas, permitiendo filtrar opcionalmente por producto.
   * @param {string} [productId] - ID opcional del producto.
   * @returns {Promise<Offert[]>} Lista de ofertas activas.
   */
  @Get()
  async findAll(
    @Query('productId', new ParseUUIDPipe({ optional: true }))
    productId?: string,
  ): Promise<Offert[]> {
    return await this.offertsService.findAll(productId);
  }

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para consultar las ofertas propias (incluyendo retiradas).
   * @param {any} request - Objeto request del agricultor autenticado.
   * @returns {Promise<Offert[]>} Lista de ofertas propias.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async findMine(@Req() request): Promise<Offert[]> {
    return await this.offertsService.findMine(request.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async update(
    @Req() request,
    @Param('id', ParseUUIDPipe) offertId: string,
    @Body() dto: UpdateOffertDto,
  ): Promise<Offert> {
    return await this.offertsService.update(offertId, request.user.sub, dto);
  }

  /**
   * Endpoint protegido (solo rol AGRICULTOR) para modificar una oferta propia.
   * @param {any} request - Objeto request del agricultor.
   * @param {string} offertId - ID de la oferta en formato UUID.
   * @param {UpdateOffertDto} dto - Datos a actualizar.
   * @returns {Promise<Offert>} La oferta actualizada.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async remove(
    @Req() request,
    @Param('id', ParseUUIDPipe) offertId: string,
  ): Promise<Offert> {
    return await this.offertsService.remove(offertId, request.user.sub);
  }

  /**
   * Patrón de mensaje TCP consumido por orders-service para consultar y validar una oferta.
   * @param {string} offertId - Identificador único de la oferta.
   * @returns {Promise<OffertSummary | null>} Resumen de la oferta o null.
   */
  @MessagePattern('get_offert')
  async getOffert(@Payload() offertId: string): Promise<OffertSummary | null> {
    return await this.offertsService.getActiveOffert(offertId);
  }

  /**
   * Patrón de mensaje TCP consumido por orders-service cuando el agricultor acepta un pedido y se requiere descontar inventario.
   * @param {{ offertId: string; quantity: number }} payload - Objeto que contiene el ID de la oferta y la cantidad a descontar.
   * @returns {Promise<boolean>} True si el descuento fue exitoso, false si falló por falta de stock.
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
