/*
Esta es la entidad en la que representamos los productos publicados directamente por los agricultores (ofertas)
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

// Postgres devuelve las columnas numeric como string; las convertimos a number
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) =>
    value === null ? null : Number.parseFloat(value),
};

@Entity('offert')
@Index(['productId', 'isActive'])
export class Offert {
  @PrimaryGeneratedColumn('uuid')
  OffertId: string;

  // Producto del catálogo maestro que se está ofertando. Vive en catalog-service,
  // por eso no hay relación entre servicios: su existencia se valida por TCP
  @Column({ type: 'uuid' })
  productId: string;

  // Agricultor que publica la oferta. Vive en users-service, por eso no hay relación entre servicios
  @Index()
  @Column({ type: 'uuid' })
  farmerId: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  pricePerUnit: number;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  availableQuantity: number;

  // Fecha de cosecha, para la trazabilidad del producto
  @Column({ type: 'date', nullable: true })
  harvestDate: string | null;

  // Municipio donde se encuentra el producto (en el caso de agrotrace solo se acepta Envigado)
  @Column()
  municipality: string;

  // Estado de la oferta: si está inactiva (agotada, retirada o borrado lógico) no se muestra a los compradores
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
