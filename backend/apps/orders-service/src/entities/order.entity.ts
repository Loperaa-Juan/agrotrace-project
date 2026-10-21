import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

/**
 * Enumerado que define los diferentes estados por los que puede pasar un pedido en AgroTrace.
 */
export enum OrderStatus {
  SOLICITADO = 'Solicitado', // Recién creado, esperando respuesta del agricultor
  ACEPTADO = 'Aceptado', // El agricultor lo aceptó
  RECHAZADO = 'Rechazado', // El agricultor lo rechazó
  ENTREGADO = 'Entregado', // El agricultor ingresó el código de entrega del comprador
  CANCELADO = 'Cancelado', // El comprador lo canceló antes de que fuera aceptado
}

/**
 * Transformador para convertir valores numéricos que PostgreSQL devuelve como string a tipo number en TypeScript.
 * @type {ValueTransformer}
 */
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) =>
    value === null ? null : Number.parseFloat(value),
};

@Entity('order')
/**
 * Entidad principal que representa los pedidos realizados por un comprador (persona o negocio)
 * sobre una de las ofertas publicadas por un agricultor.
 */
export class Order {
  @PrimaryGeneratedColumn('uuid')
  OrderId: string;

  /**
  * Identificador del usuario que hace el pedido (persona o negocio). Vive en users-service, por lo que no existe relación 
  * directa entre bases de datos. 
  */
  @Index()
  @Column({ type: 'uuid' })
  buyerId: string;

  /**
   * Identificador de la oferta que se está pidiendo. Vive en catalog-service, por lo que no hay relación directa entre servicios.
   */
  @Index()
  @Column({ type: 'uuid' })
  offertId: string;

  /**
   * Identificador del agricultor dueño de la oferta. Se almacena localmente para optimizar consultas de sus pedidos 
   * sin depender de catalog-service.
   */
  @Index()
  @Column({ type: 'uuid' })
  farmerId: string;

  /**
   * Cantidad pedida, expresada en la unidad de medida oficial del producto (lb, kg, g, unidad).
   */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  quantity: number;

  /**
   * Precio unitario al momento del registro del pedido; si el agricultor modifica el precio de la oferta 
   * posteriormente, este pedido no se altera.
   */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  /**
   * Valor total monetario calculado como (quantity * unitPrice).
   */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalPrice: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.SOLICITADO })
  status: OrderStatus;

  /**
   * Código de seguridad de 6 dígitos visible para el comprador, el cual el agricultor debe ingresar obligatoriamente 
   * al realizar la entrega.
   */

  @Column({ length: 6 })
  deliveryCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
