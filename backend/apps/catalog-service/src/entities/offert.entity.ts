/*
Esta es la entidad en la que representamos los productos publicados directamente por los agricultores (ofertas)
*/

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  type Relation,
  type ValueTransformer,
} from 'typeorm';
import { Product } from './product.entitie';

// Calidad que se guarda en la oferta. El modelo de visión artificial también detecta "Mala"
// pero un producto podrido no se puede vender, así que ese estado nunca llega a la base de datos
export enum AiQuality {
  BUENA = 'Buena',
  REGULAR = 'Regular',
}

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

  // Producto del catálogo maestro que se está ofertando
  @Column({ type: 'uuid' })
  productId: string;

  // Relación de muchos a uno: Un producto del catálogo puede tener muchas ofertas
  @ManyToOne(() => Product, (product) => product.offerts, {
    nullable: false,
    onDelete: 'RESTRICT', // No se puede borrar un producto que tenga ofertas
  })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;

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

  // URL de la foto del producto ofertado. Pendiente: se activa cuando exista la conexión con S3
  // (donde se guardarán las fotos) y el microservicio de IA que las clasifica
  // @Column({ type: 'varchar', nullable: true })
  // imageUrl: string | null;

  // Calidad asignada por el modelo de visión artificial (ai-service): solo Buena o Regular.
  // Es null mientras la foto no haya sido clasificada. No la envía el agricultor: no está en los DTOs
  // de la oferta. Se calcula con qualityToStore (offerts/ai-quality.ts), que rechaza los productos malos
  @Column({ type: 'enum', enum: AiQuality, nullable: true })
  aiQuality: AiQuality | null;

  // Estado de la oferta: si está inactiva (agotada, retirada o borrado lógico) no se muestra a los compradores
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
