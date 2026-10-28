import {
  applyDecorators,
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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '@app/shared';
import { FarmerOrder, OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from '../entities/order.entity';
import { FarmerOrderDto } from './dto/farmer-order.dto';

/** Documentación del parámetro :id que comparten las rutas de un pedido. */
const orderIdParam = ApiParam({
  name: 'id',
  format: 'uuid',
  description: 'Id del pedido',
});

/** Cuándo responde 403 una ruta reservada a compradores. */
const buyerRoleRequired = 'El usuario no tiene el rol Persona o Negocio';

/** Cuándo responde 403 una ruta reservada a agricultores. */
const farmerRoleRequired = 'El usuario no tiene el rol Agricultor';

/**
 * Documentación común de las rutas protegidas: piden token y pueden responder 401 o 403.
 * @param forbidden - Cuándo responde 403 la ruta.
 */
const protectedDocs = (forbidden: string) =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' }),
    ApiForbiddenResponse({ description: forbidden }),
  );

/** Respuesta 404 de las rutas que buscan un pedido por id. */
const orderNotFound = ApiNotFoundResponse({
  description: 'El pedido no existe',
});

/**
 * Controlador HTTP encargado de exponer los endpoints de gestión de pedidos.
 * El ID y el rol de usuario se obtienen de manera segura del token (`request.user`).
 */
@ApiTags('orders')
@ApiExtraModels(Order, FarmerOrderDto)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Permite a un comprador (Persona o Negocio) crear un nuevo pedido.
   * @param request - Objeto request con la información del token del usuario.
   * @param dto - DTO con los datos de creación de la orden.
   * @returns La orden creada.
   */
  @ApiOperation({ summary: 'Crea un pedido sobre una oferta' })
  @protectedDocs(
    'El usuario no tiene el rol Persona o Negocio, o es Persona y pide más de 50 lb',
  )
  @ApiCreatedResponse({ description: 'Pedido creado', type: Order })
  @ApiBadRequestResponse({
    description:
      'El cuerpo no es válido o se pide más de lo que hay disponible',
  })
  @ApiNotFoundResponse({ description: 'La oferta o un usuario no existe' })
  @ApiServiceUnavailableResponse({
    description: 'catalog-service o users-service no responden',
  })
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
  @ApiOperation({ summary: 'Lista los pedidos del comprador autenticado' })
  @protectedDocs(buyerRoleRequired)
  @ApiOkResponse({
    description: 'Pedidos del comprador, del más reciente al más antiguo',
    type: [Order],
  })
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
  @ApiOperation({
    summary: 'Lista los pedidos recibidos por el agricultor autenticado',
  })
  @protectedDocs(farmerRoleRequired)
  @ApiOkResponse({
    description: 'Pedidos recibidos, sin el código de entrega',
    type: [FarmerOrderDto],
  })
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
  @ApiOperation({
    summary: 'Marca un pedido como entregado con el código del comprador',
  })
  @protectedDocs(farmerRoleRequired)
  @orderIdParam
  @ApiBody({
    schema: {
      type: 'object',
      required: ['deliveryCode'],
      properties: {
        deliveryCode: {
          type: 'string',
          minLength: 6,
          maxLength: 6,
          example: '483920',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Pedido entregado, sin el código de entrega',
    type: FarmerOrderDto,
  })
  @ApiBadRequestResponse({
    description:
      'El id no es un UUID, el pedido no está Aceptado o el código es incorrecto',
  })
  @orderNotFound
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
  @ApiOperation({
    summary: 'Acepta, rechaza o cancela un pedido según quién lo pida',
  })
  @protectedDocs('El usuario no puede cambiar el pedido a ese estado')
  @orderIdParam
  @ApiOkResponse({
    description:
      'Pedido actualizado; sin código de entrega si lo cambió el agricultor',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(Order) },
        { $ref: getSchemaPath(FarmerOrderDto) },
      ],
    },
  })
  @ApiBadRequestResponse({
    description:
      'El id o el estado no son válidos, o el pedido ya no está Solicitado',
  })
  @orderNotFound
  @ApiServiceUnavailableResponse({
    description: 'catalog-service no responde al aceptar el pedido',
  })
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
