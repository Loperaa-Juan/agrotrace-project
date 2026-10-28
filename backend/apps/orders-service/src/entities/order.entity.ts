/*
Esta es la entidad en la que representamos los pedidos que hace un comprador (persona o negocio)
a un agricultor sobre una de sus ofertas
*/
import { ApiProperty } from '@nestjs/swagger';
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
 * Enumerado que define los diferentes estados posibles por los que pasa un pedido.
 */
export enum OrderStatus {
  SOLICITADO = 'Solicitado', // Recién creado, esperando respuesta del agricultor
  ACEPTADO = 'Aceptado', // El agricultor lo aceptó
  RECHAZADO = 'Rechazado', // El agricultor lo rechazó
  ENTREGADO = 'Entregado', // El agricultor ingresó el código de entrega del comprador
  CANCELADO = 'Cancelado', // El comprador lo canceló antes de que fuera aceptado
}

/**
 * Estructura de los datos públicos de contacto de cada parte (agricultor o comprador)
 * que se copian al pedido en el momento de su creación.
 */
export interface OrderContact {
  userId: string;
  name: string;
  phone: string;
  municipality: string;
}

/** Esquema OpenAPI de {@link OrderContact}: los datos de contacto que se copian al pedido. */
const orderContactSchema = {
  type: 'object',
  nullable: true,
  properties: {
    userId: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Juan Pérez' },
    phone: { type: 'string', example: '+573001234567' },
    municipality: { type: 'string', example: 'Envigado' },
  },
} as const;

/**
 * Transformador para convertir valores numéricos que PostgreSQL devuelve como string a tipo number.
 */
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) =>
    value === null ? null : Number.parseFloat(value),
};

@Entity('order')
/**
 * Entidad de base de datos que representa un pedido realizado en la plataforma.
 */
export class Order {
  /** Identificador único del pedido en formato UUID. */
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  OrderId: string;

  /** Identificador del usuario que hace el pedido. Vive en users-service, por lo que no hay relación directa por FK. */
  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ type: 'uuid' })
  buyerId: string;

  /** Datos del comprador al momento del pedido para facilitar la entrega. Puede ser null en registros antiguos. */
  @ApiProperty(orderContactSchema)
  @Column({ type: 'jsonb', nullable: true })
  buyer: OrderContact | null;

  /** Identificador de la oferta solicitada. Vive en catalog-service. */
  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ type: 'uuid' })
  offertId: string;

  /** Identificador del agricultor dueño de la oferta. Se almacena localmente para consultas rápidas. */
  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ type: 'uuid' })
  farmerId: string;

  /** Datos del agricultor al momento del pedido para mostrarlos al comprador. Puede ser null en registros antiguos. */
  @ApiProperty(orderContactSchema)
  @Column({ type: 'jsonb', nullable: true })
  farmer: OrderContact | null;

  /** Cantidad solicitada del producto (lb, kg, g, unidad). */
  @ApiProperty({ example: 5 })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  quantity: number;

  /** Precio por unidad al momento del pedido (si el agricultor cambia el precio después, este pedido no se afecta). */
  @ApiProperty({ example: 2500 })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  /** Valor total calculado (quantity * unitPrice). */
  @ApiProperty({ example: 12500 })
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalPrice: number;

  /** CEstatus de la orden, el cual es por default "SOLICITADO" */
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SOLICITADO })
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.SOLICITADO })
  status: OrderStatus;

  /** Código de seguridad de 6 dígitos que debe ingresar el agricultor al entregar el producto. */
  @ApiProperty({ example: '483920', minLength: 6, maxLength: 6 })
  @Column({ length: 6 })
  deliveryCode: string;

  /** Fecha en que se creó el pedido. */
  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  /** Fecha de la última modificación del pedido. */
  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
