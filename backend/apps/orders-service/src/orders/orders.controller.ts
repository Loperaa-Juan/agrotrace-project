import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from '../entities/order.entity';

/**
 * Controlador encargado de exponer los endpoints HTTP para la gestión de pedidos.
 * Los compradores (Persona o Negocio) crean y consultan sus pedidos; el agricultor los recibe, entrega o cambia su estado.
 * Nota: El ID y el rol del usuario siempre se obtienen de manera segura del token (request.user).
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Endpoint protegido para que un comprador (Persona o Negocio) cree un nuevo pedido.
   * @param {any} request - Objeto de petición HTTP con la información del token del usuario.
   * @param {CreateOrderDto} dto - Datos necesarios para la creación de la orden.
   * @returns {Promise<Order>} La orden recién creada.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PERSONA, Role.NEGOCIO)
  async create(@Req() request, @Body() dto: CreateOrderDto): Promise<Order> {
    return await this.ordersService.create(
      request.user.sub,
      request.user.role,
      dto,
    );
  }

  /**
   * Endpoint protegido para que el comprador consulte la lista de sus propios pedidos.
   * @param {any} request - Objeto de petición HTTP con los datos del usuario autenticado.
   * @returns {Promise<Order[]>} Lista de órdenes hechas por el comprador.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PERSONA, Role.NEGOCIO)
  async findMine(@Req() request): Promise<Order[]> {
    return await this.ordersService.findByBuyer(request.user.sub);
  }

  /**
   * Endpoint protegido para que el agricultor consulte los pedidos recibidos en sus ofertas.
   * @param {any} request - Objeto de petición HTTP con los datos del agricultor autenticado.
   * @returns {Promise<Omit<Order, 'deliveryCode'>[]>} Lista de órdenes sin incluir el código de entrega por seguridad.
   */
  @Get('received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async findReceived(@Req() request): Promise<Omit<Order, 'deliveryCode'>[]> {
    return await this.ordersService.findByFarmer(request.user.sub);
  }

  /**
   * Endpoint protegido para que el agricultor marque un pedido como entregado 
   * ingresando el código de 6 dígitos dictado por el comprador.
   * @param {any} request - Objeto de petición HTTP con los datos del agricultor.
   * @param {string} orderId - ID de la orden en formato UUID.
   * @param {string} deliveryCode - Código de entrega de 6 dígitos.
   * @returns {Promise<Order>} La orden actualizada con estado Entregado.
   */
  @Patch(':id/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async deliver(
    @Req() request,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body('deliveryCode') deliveryCode: string,
  ): Promise<Order> {
    return await this.ordersService.deliver(
      orderId,
      request.user.sub,
      deliveryCode,
    );
  }

  /**
   * Endpoint protegido para cambiar el estado de un pedido (aceptar, rechazar o cancelar).
   * Todos los roles pueden acceder a la ruta, pero la lógica de negocio validará quién tiene permiso.
   * @param {any} request - Objeto de petición HTTP del usuario.
   * @param {string} orderId - ID de la orden en formato UUID.
   * @param {UpdateOrderStatusDto} dto - DTO que contiene el nuevo estado deseado.
   * @returns {Promise<Order>} La orden con su estado actualizado.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PERSONA, Role.NEGOCIO, Role.AGRICULTOR)
  async changeStatus(
    @Req() request,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    return await this.ordersService.changeStatus(
      orderId,
      request.user.sub,
      dto.status,
    );
  }
}
