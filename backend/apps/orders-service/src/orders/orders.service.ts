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

// Solo los negocios pueden pedir más de esta cantidad de libras en un pedido
const LIMITE_LIBRAS = 50;

// Cuántas libras hay en una unidad de cada medida. Las ofertas por 'unidad' no tienen límite
const LIBRAS_POR_UNIDAD: Record<string, number> = {
  lb: 1,
  kg: 2.20462,
  g: 0.00220462,
};

// Quién puede pasar un pedido a cada estado. Entregado no está aquí: se hace con el código (deliver)
const QUIEN_CAMBIA_EL_ESTADO: Partial<
  Record<OrderStatus, 'agricultor' | 'comprador'>
> = {
  [OrderStatus.ACEPTADO]: 'agricultor',
  [OrderStatus.RECHAZADO]: 'agricultor',
  [OrderStatus.CANCELADO]: 'comprador',
};

// Pedido tal como lo ve el agricultor: sin el código de entrega
export type FarmerOrder = Omit<Order, 'deliveryCode'>;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly catalogClient: CatalogClient,
    private readonly usersClient: UsersClient,
  ) {}

  // El comprador sale del token; el agricultor y el precio se toman de la oferta.
  // Los datos del agricultor y del comprador se consultan solo si el pedido es válido
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

  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  // El agricultor no ve el código de entrega: se lo dicta el comprador al recibir el pedido
  async findByFarmer(farmerId: string): Promise<FarmerOrder[]> {
    const orders = await this.orderRepository.find({
      where: { farmerId },
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.withoutDeliveryCode(order));
  }

  // El pedido pasa a Entregado solo si ya fue aceptado y el agricultor ingresa el código que le da el comprador
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

  // Aceptar o rechazar le corresponde al agricultor; cancelar, al comprador.
  // Solo se puede hacer mientras el pedido está Solicitado. Si quien cambia es el agricultor,
  // la respuesta no incluye el código de entrega
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

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { OrderId: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  // Copia del pedido sin el código: el pedido guardado lo conserva
  private withoutDeliveryCode(order: Order): FarmerOrder {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deliveryCode, ...farmerOrder } = order;
    return farmerOrder;
  }

  // Solo los datos públicos del usuario: sin correo, documento ni dirección
  private toContact(user: UserSummary): OrderContact {
    return {
      userId: user.userId,
      name: user.name,
      phone: user.phone,
      municipality: user.municipality,
    };
  }

  // Código aleatorio de 6 dígitos (puede empezar en 0, por eso se guarda como texto)
  private generateDeliveryCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
