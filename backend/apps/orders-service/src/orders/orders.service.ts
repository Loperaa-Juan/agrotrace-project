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
import { Order, OrderStatus } from '../entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CatalogClient } from './catalog.client';

/**
 * Límite en libras permitido para compradores comunes en un solo pedido.
 */
const LIMITE_LIBRAS = 50;

/**
 * Tabla de conversión de unidades a libras. Las ofertas por 'unidad' no tienen límite de conversión en libras.
 */
const LIBRAS_POR_UNIDAD: Record<string, number> = {
  lb: 1,
  kg: 2.20462,
  g: 0.00220462,
};

/**
 * Mapeo de quién tiene autorización para pasar un pedido a determinado estado. (Nota: 'Entregado' se maneja mediante código de entrega).
 */
const QUIEN_CAMBIA_EL_ESTADO: Partial<
  Record<OrderStatus, 'agricultor' | 'comprador'>
> = {
  [OrderStatus.ACEPTADO]: 'agricultor',
  [OrderStatus.RECHAZADO]: 'agricultor',
  [OrderStatus.CANCELADO]: 'comprador',
};

/**
 * Servicio encargado de gestionar toda la lógica de negocio relacionada con las órdenes,
 * validación de límites de compra, interacción con el catálogo y flujos de entrega.
 */
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly catalogClient: CatalogClient,
  ) {}

  /**
   * Crea una nueva orden validando la existencia de la oferta, restricciones de cantidad por rol y calculando precios.
   * @param {string} buyerId - Identificador único del comprador obtenido del token.
   * @param {Role} buyerRole - Rol actual del comprador (Persona, Negocio).
   * @param {CreateOrderDto} dto - DTO con los datos de la oferta y cantidad.
   * @returns {Promise<Order>} La entidad de la orden guardada en base de datos.
   * @throws {ForbiddenException} Si un usuario común excede el límite de libras permitido.
   * @throws {BadRequestException} Si la cantidad solicitada supera el stock disponible en la oferta.
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

    return this.orderRepository.save(
      this.orderRepository.create({
        buyerId,
        offertId: dto.offertId,
        farmerId: offert.farmerId,
        quantity: dto.quantity,
        unitPrice: offert.pricePerUnit,
        totalPrice: Math.round(dto.quantity * offert.pricePerUnit * 100) / 100,
        status: OrderStatus.SOLICITADO,
        deliveryCode: this.generateDeliveryCode(),
      }),
    );
  }

  /**
   * Consulta todos los pedidos realizados por un comprador específico, ordenados del más reciente al más antiguo.
   * @param {string} buyerId - Identificador único del comprador.
   * @returns {Promise<Order[]>} Lista de pedidos del comprador.
   */
  async findByBuyer(buyerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { buyerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Consulta los pedidos recibidos por un agricultor. 
   * Excluye el código de entrega por seguridad (solo se dicta verbalmente al recibir).
   * @param {string} farmerId - Identificador único del agricultor.
   * @returns {Promise<Omit<Order, 'deliveryCode'>[]>} Lista de pedidos filtrados sin el código de entrega.
   */
  async findByFarmer(farmerId: string): Promise<Omit<Order, 'deliveryCode'>[]> {
    const orders = await this.orderRepository.find({
      where: { farmerId },
      order: { createdAt: 'DESC' },
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return orders.map(({ deliveryCode, ...order }) => order);
  }

  /**
   * Marca un pedido como Entregado, validando que pertenezca al agricultor, 
   * que se encuentre previamente aceptado y que el código de entrega coincida.
   * @param {string} orderId - ID de la orden.
   * @param {string} farmerId - ID del agricultor que intenta entregar.
   * @param {string} deliveryCode - Código de seguridad de 6 dígitos provisto por el comprador.
   * @returns {Promise<Order>} La orden actualizada con estado Entregado.
   * @throws {ForbiddenException} Si el agricultor intenta entregar una orden que no le pertenece.
   * @throws {BadRequestException} Si la orden no está aceptada o el código es inválido.
   */
  async deliver(
    orderId: string,
    farmerId: string,
    deliveryCode: string,
  ): Promise<Order> {
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
    return this.orderRepository.save(order);
  }

  /**
   * Cambia el estado de una orden (Aceptar, Rechazar o Cancelar) validando permisos de actor y estado inicial.
   * @param {string} orderId - ID de la orden.
   * @param {string} userId - ID del usuario que realiza la acción.
   * @param {OrderStatus} status - Nuevo estado al que se desea llevar la orden.
   * @returns {Promise<Order>} La orden con el estado actualizado.
   * @throws {ForbiddenException} Si el usuario no tiene permisos para aplicar ese estado específico.
   * @throws {BadRequestException} Si el pedido ya no se encuentra en estado 'Solicitado'.
   */
  async changeStatus(
    orderId: string,
    userId: string,
    status: OrderStatus,
  ): Promise<Order> {
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
    return this.orderRepository.save(order);
  }

  /**
   * Busca una orden por su identificador único o lanza una excepción si no existe.
   * @private
   * @param {string} orderId - ID de la orden.
   * @returns {Promise<Order>} La entidad de la orden encontrada.
   * @throws {NotFoundException} Si no se encuentra la orden.
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
   * Genera un código aleatorio de seguridad de 6 dígitos para la entrega (puede empezar con ceros, por eso es texto).
   * @private
   * @returns {string} Código numérico formateado a 6 caracteres.
   */
  private generateDeliveryCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
