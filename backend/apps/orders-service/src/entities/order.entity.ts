/*
Esta es la entidad en la que representamos los pedidos que hace un comprador (persona o negocio)
a un agricultor sobre una de sus ofertas
*/

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type ValueTransformer,
} from 'typeorm';

// Estados por los que pasa un pedido
export enum OrderStatus {
  SOLICITADO = 'Solicitado', // Recién creado, esperando respuesta del agricultor
  ACEPTADO = 'Aceptado', // El agricultor lo aceptó
  RECHAZADO = 'Rechazado', // El agricultor lo rechazó
  ENTREGADO = 'Entregado', // El agricultor ingresó el código de entrega del comprador
  CANCELADO = 'Cancelado', // El comprador lo canceló antes de que fuera aceptado
}

// Postgres devuelve las columnas numeric como string; las convertimos a number
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) =>
    value === null ? null : Number.parseFloat(value),
};

@Entity('order')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  OrderId: string;

  // Usuario que hace el pedido (persona o negocio). Vive en users-service, por eso no hay relación entre servicios
  @Index()
  @Column({ type: 'uuid' })
  buyerId: string;

  // Oferta que se está pidiendo. Vive en catalog-service, por eso no hay relación entre servicios
  @Index()
  @Column({ type: 'uuid' })
  offertId: string;

  // Agricultor dueño de la oferta. Se guarda aquí para consultar sus pedidos sin preguntar a catalog-service
  @Index()
  @Column({ type: 'uuid' })
  farmerId: string;

  // Cantidad pedida, en la unidad de medida del producto (lb, kg, g, unidad)
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  quantity: number;

  // Precio por unidad al momento del pedido: si el agricultor cambia el precio de la oferta, el pedido no cambia
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  unitPrice: number;

  // quantity * unitPrice
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalPrice: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.SOLICITADO })
  status: OrderStatus;

  // Código de 6 dígitos que ve el comprador y que el agricultor debe ingresar al entregar el pedido
  @Column({ length: 6 })
  deliveryCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
