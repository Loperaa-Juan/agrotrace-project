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

// Los compradores (Persona o Negocio) hacen pedidos; el agricultor los recibe y los entrega.
// El id y el rol siempre salen del token (request.user), nunca del body
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PERSONA, Role.NEGOCIO)
  async findMine(@Req() request): Promise<Order[]> {
    return await this.ordersService.findByBuyer(request.user.sub);
  }

  @Get('received')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.AGRICULTOR)
  async findReceived(@Req() request): Promise<Omit<Order, 'deliveryCode'>[]> {
    return await this.ordersService.findByFarmer(request.user.sub);
  }

  // El agricultor ingresa el código que le da el comprador al recibir el pedido
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

  // Aceptar, rechazar o cancelar. Todos los roles entran a la ruta; el servicio decide
  // quién puede hacer cada cambio (agricultor: aceptar/rechazar, comprador: cancelar)
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
