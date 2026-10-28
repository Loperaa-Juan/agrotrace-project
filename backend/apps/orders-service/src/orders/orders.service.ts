import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt } from 'node:crypto';
import { Role } from '@app/shared';
import { Order, OrderContact, OrderStatus } from '../entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CatalogClient } from './catalog.client';
import { UserSummary, UsersClient } from '../profile/users.client';

/** Límite en libras permitido para compradores comunes en un pedido. */
const LIMITE_LIBRAS = 50;

/** Tabla de equivalencias en libras por unidad de medida. Las ofertas por 'unidad' no tienen límite. */
const LIBRAS_POR_UNIDAD: Record<string, number> = {
  lb: 1,
  kg: 2.20462,
  g: 0.00220462,
};

/** Mapeo de roles autorizados para cambiar un pedido a un estado específico. */
const QUIEN_CAMBIA_EL_ESTADO: Partial<
  Record<OrderStatus, 'agricultor' | 'comprador'>
> = {
  [OrderStatus.ACEPTADO]: 'agricultor',
  [OrderStatus.RECHAZADO]: 'agricultor',
  [OrderStatus.CANCELADO]: 'comprador',
};

/** Tipo que representa un pedido visto por el agricultor (omitiendo el código de entrega de seguridad). */
export type FarmerOrder = Omit<Order, 'deliveryCode'>;

/**
 * Servicio encargado de gestionar toda la lógica de negocio de los pedidos,
 * validación de límites de compra, interacción con catálogos y usuarios, y códigos de entrega.
 */
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly catalogClient: CatalogClient,
    private readonly usersClient: UsersClient,
  ) {}

  /**
   * Crea una nueva orden validando la oferta, límites de compra por rol y obteniendo contactos vía TCP.
   * @param buyerId - ID del comprador.
   * @param buyerRole - Rol del comprador.
   * @param dto - DTO con datos del pedido.
   * @returns La orden creada y guardada.
   */
  async create(
    buyerId: string,
    buyerRole: Role,
    dto: CreateOrderDto,
  ): Promise<Order> {
    const offert = await this.catalogClient.getOffert(dto.offertId);

    const librasPorUnidad = LIBRAS_POR_UNIDAD[offert.unitOfMeasure];
    if (
      buyerRole !== Role.NEGOCIO &&
      librasPorUnidad &&
      dto.quantity * librasPorUnidad > LIMITE_LIBRAS
    ) {
      throw new ForbiddenException(
        `Only businesses can order more than ${LIMITE_LIBRAS} lb`,
      );
    }
    if (dto.quantity > offert.availableQuantity) {
      throw new BadRequestException(
        `Only ${offert.availableQuantity} available for this offert`,
      );
    }

    const [farmer, buyer] = await Promise.all([
      this.usersClient.getUser(offert.farmerId),
      this.usersClient.getUser(buyerId),
    ]);

    return this.orderRepository.save(
      this.orderRepository.create({
        buyerId,
        buyer: this.toContact(buyer),
        offertId: dto.offertId,
        farmerId: offert.farmerId,
        farmer: this.toContact(farmer),
        quantity: dto.quantity,
        unitPrice: offert.pricePerUnit,
        totalPrice: Math.round(dto.quantity * offert.pricePerUnit * 100) / 100,
        status: OrderStatus.SOLICITADO,
        deliveryCode: this.generateDeliveryCode(),
      }),
    );
  }

  /**
   * Consulta los pedidos realizados por un comprador.
   * @param buyerId - ID del comprador.
   * @returns Lista de pedidos ordenados por fecha descendente.
   */
  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Consulta los pedidos recibidos por un agricultor (excluyendo el código de entrega).
   * @param farmerId - ID del agricultor.
   * @returns Lista de pedidos sin código de entrega.
   */
  async findByFarmer(farmerId: string): Promise<FarmerOrder[]> {
    const orders = await this.orderRepository.find({
      where: { farmerId },
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.withoutDeliveryCode(order));
  }

  /**
   * Marca un pedido como entregado validando permisos, estado aceptado y código correcto.
   * @param orderId - ID de la orden.
   * @param farmerId - ID del agricultor.
   * @param deliveryCode - Código de entrega.
   * @returns La orden actualizada sin el código de entrega.
   */
  async deliver(
    orderId: string,
    farmerId: string,
    deliveryCode: string,
  ): Promise<FarmerOrder> {
    const order = await this.findOrder(orderId);
    if (order.farmerId !== farmerId) {
      throw new ForbiddenException('You can only deliver your own orders');
    }
    if (order.status !== OrderStatus.ACEPTADO) {
      throw new BadRequestException('Only accepted orders can be delivered');
    }
    if (order.deliveryCode !== deliveryCode) {
      throw new BadRequestException('Invalid delivery code');
    }

    order.status = OrderStatus.ENTREGADO;
    return this.withoutDeliveryCode(await this.orderRepository.save(order));
  }

  /**
   * Cambia el estado de una orden (Aceptar, Rechazar o Cancelar).
   * @param orderId - ID de la orden.
   * @param userId - ID del usuario que realiza la acción.
   * @param status - Nuevo estado.
   * @returns La orden con el estado actualizado.
   */
  async changeStatus(
    orderId: string,
    userId: string,
    status: OrderStatus,
  ): Promise<Order | FarmerOrder> {
    const order = await this.findOrder(orderId);

    const responsable = QUIEN_CAMBIA_EL_ESTADO[status];
    const responsableId =
      responsable === 'agricultor' ? order.farmerId : order.buyerId;
    if (!responsable || responsableId !== userId) {
      throw new ForbiddenException(
        `You are not allowed to change this order to ${status}`,
      );
    }
    if (order.status !== OrderStatus.SOLICITADO) {
      throw new BadRequestException(
        'Only requested orders can be accepted, rejected or cancelled',
      );
    }

    // Al aceptar, el agricultor se compromete con el producto: se descuenta de la oferta.
    // Si ya no alcanza, catalog-service lo rechaza y el pedido sigue Solicitado
    if (status === OrderStatus.ACEPTADO) {
      await this.catalogClient.decreaseOffertQuantity(
        order.offertId,
        order.quantity,
      );
    }

    order.status = status;
    const saved = await this.orderRepository.save(order);
    return responsable === 'agricultor'
      ? this.withoutDeliveryCode(saved)
      : saved;
  }

  /**
   * Busca una orden por ID o lanza un error si no existe.
   * @param orderId - ID de la orden.
   * @returns La orden encontrada.
   */
  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { OrderId: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  /**
   * Retorna una copia del pedido excluyendo el código de seguridad de entrega.
   * @param order - Orden original.
   * @returns Orden sin el campo deliveryCode.
   */
  private withoutDeliveryCode(order: Order): FarmerOrder {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deliveryCode, ...farmerOrder } = order;
    return farmerOrder;
  }

  /**
   * Extrae únicamente los datos públicos de contacto de un usuario.
   * @param user - Datos completos del usuario.
   * @returns Datos de contacto resumidos.
   */
  private toContact(user: UserSummary): OrderContact {
    return {
      userId: user.userId,
      name: user.name,
      phone: user.phone,
      municipality: user.municipality,
    };
  }

  /**
   * Genera un código aleatorio de seguridad de 6 dígitos.
   * @returns Código numérico formateado como cadena.
   */
  private generateDeliveryCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
