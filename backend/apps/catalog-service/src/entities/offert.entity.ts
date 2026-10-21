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

/**
 * Calidades permitidas que se guardan en la oferta.
 * Nota: El modelo de visión artificial también detecta "Mala", pero un producto en mal estado 
 * no se puede vender, por lo que ese estado nunca llega a persistirse en la base de datos.
 */
export enum AiQuality {
  BUENA = 'Buena',
  REGULAR = 'Regular',
}

/**
 * Transformador para convertir valores numéricos que PostgreSQL retorna como cadenas a tipo number.
 */
const decimalTransformer: ValueTransformer = {
  to: (value: number) => value,
  from: (value: string | null) =>
    value === null ? null : Number.parseFloat(value),
};

@Entity('offert')
@Index(['productId', 'isActive'])
/**
 * Entidad de base de datos que representa una oferta publicada por un agricultor en la plataforma.
 */
export class Offert {
  @PrimaryGeneratedColumn('uuid')
  OffertId: string;

  /** Producto del catálogo maestro al que pertenece la oferta. */
  @Column({ type: 'uuid' })
  productId: string;

  /** Relación de muchos a uno: un producto del catálogo puede tener muchas ofertas. */
  @ManyToOne(() => Product, (product) => product.offerts, {
    nullable: false,
    onDelete: 'RESTRICT', // No se puede borrar un producto que tenga ofertas
  })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;

  /** ID del agricultor que publica la oferta (vive en users-service). */
  @Index()
  @Column({ type: 'uuid' })
  farmerId: string;

  /** Descripción detallada o notas adicionales de la oferta. */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Precio monetario establecido por unidad de medida. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  pricePerUnit: number;

  /** Cantidad total de producto disponible para la venta. */
  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  availableQuantity: number;

  /** Fecha de cosecha del producto, utilizada para asegurar la trazabilidad alimentaria. */
  @Column({ type: 'date', nullable: true })
  harvestDate: string | null;

  /** 
   * URL de la fotografía del producto ofertado. 
   * (Pendiente de activación al integrar almacenamiento S3 y el microservicio de IA).
   */
  // @Column({ type: 'varchar', nullable: true })
  // imageUrl: string | null;

  /** 
   * Calidad evaluada por el modelo de visión artificial (ai-service). 
   * Es null hasta que la foto es clasificada automáticamente.
   */
  @Column({ type: 'enum', enum: AiQuality, nullable: true })
  aiQuality: AiQuality | null;

  /** Estado de visibilidad de la oferta (true si está activa, false si está agotada o retirada). */
  @Column({ default: true })
  isActive: boolean;

  /** Fecha y hora de creación del registro. */
  @CreateDateColumn()
  createdAt: Date;

  /** Fecha y hora de la última actualización del registro. */
  @UpdateDateColumn()
  updatedAt: Date;
}
