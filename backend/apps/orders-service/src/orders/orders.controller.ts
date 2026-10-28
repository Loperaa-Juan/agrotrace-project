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
import { FarmerOrder, OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from '../entities/order.entity';

/**
 * Controlador HTTP encargado de exponer los endpoints de gestión de pedidos.
 * El ID y el rol de usuario se obtienen de manera segura del token (`request.user`).
 */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Permite a un comprador (Persona o Negocio) crear un nuevo pedido.
   * @param request - Objeto request con la información del token del usuario.
   * @param dto - DTO con los datos de creación de la orden.
   * @returns La orden creada.
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
   * Permite al comprador consultar la lista de sus propios pedidos.
   * @param request - Objeto request del usuario autenticado.
   * @returns Lista de órdenes del comprador.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PERSONA, Role.NEGOCIO)
  async findMine(@Req() request): Promise<Order[]> {
    return await this.ordersService.findByBuyer(request.user.sub);
  }

  /**
   * Permite al agricultor consultar los pedidos recibidos en sus ofertas.
   * @param request - Objeto request del agricultor autenticado.
   * @returns Lista de pedidos recibidos (sin código de entrega).
   */
  @Get('received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async findReceived(@Req() request): Promise<FarmerOrder[]> {
    return await this.ordersService.findByFarmer(request.user.sub);
  }

  /**
   * Permite al agricultor marcar un pedido como entregado ingresando el código provisto por el comprador.
   * @param request - Objeto request del agricultor.
   * @param orderId - ID de la orden en formato UUID.
   * @param deliveryCode - Código de entrega de 6 dígitos.
   * @returns La orden actualizada sin el código de entrega.
   */
  @Patch(':id/deliver')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async deliver(
    @Req() request,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body('deliveryCode') deliveryCode: string,
  ): Promise<FarmerOrder> {
    return await this.ordersService.deliver(
      orderId,
      request.user.sub,
      deliveryCode,
    );
  }

  /**
   * Permite aceptar, rechazar o cancelar un pedido según los permisos de rol correspondientes.
   * @param request - Objeto request del usuario.
   * @param orderId - ID de la orden en formato UUID.
   * @param dto - DTO con el nuevo estado.
   * @returns La orden actualizada.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PERSONA, Role.NEGOCIO, Role.AGRICULTOR)
  async changeStatus(
    @Req() request,
    @Param('id', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<Order | FarmerOrder> {
    return await this.ordersService.changeStatus(
      orderId,
      request.user.sub,
      dto.status,
    );
  }
}
