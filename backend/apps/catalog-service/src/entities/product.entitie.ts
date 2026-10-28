/*
En agrotrace debemos manejar un catálogo maestro donde se definen los productos que se pueden comercializar en la plataforma.
*/

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  type Relation,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Offert } from './offert.entity';

/**
 * Categorías oficiales disponibles para clasificar los productos agrícolas del catálogo maestro.
// Categorías de productos agrícolas del catálogo (Estas serán cambiadas cuando entrenemos el modelo de Visión Artificial
 * ya que esta dependerá de las categorías que vea el modelo durante el entrenamiento)
 */
export enum ProductCategory {
  FRUTAS = 'Frutas',
  VERDURAS = 'Verduras',
  HORTALIZAS = 'Hortalizas',
  TUBERCULOS = 'Tubérculos',
  GRANOS = 'Granos',
  CEREALES = 'Cereales',
}

/**
 * Unidades de medida estándar utilizadas para comercializar los productos en la plataforma.
 */
export enum UnitOfMeasure {
  LIBRA = 'lb',
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  UNIDAD = 'unidad',
}

// Cada oferta de un agricultor (precio, cantidad, disponibilidad) debe referenciar un producto de este catálogo.
@Entity('product')
/**
 * Entidad de base de datos que representa el catálogo maestro de productos de AgroTrace.
 */
export class Product {
  /** Identificador único del producto en formato UUID. */
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  ProductId: string;

  /** Nombre único descriptivo del producto en el catálogo. */
  @ApiProperty({ example: 'Tomate chonto' })
  @Index({ unique: true })
  @Column({ length: 100 })
  name: string;

  /** Categoría a la que pertenece el producto dentro del catálogo agrícola. */
  @ApiProperty({ enum: ProductCategory, example: ProductCategory.HORTALIZAS })
  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory;

  /** Unidad de medida estándar empleada para comercializar el producto. */
  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.LIBRA })
  @Column({ type: 'enum', enum: UnitOfMeasure, default: UnitOfMeasure.LIBRA })
  unitOfMeasure: UnitOfMeasure;

  /** Descripción general o características del producto maestro. */
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Tomate rojo para ensalada',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * URL de la imagen de referencia del producto en el catálogo.
   */
  // @Column({ type: "varchar", nullable: true })
  // referenceImageUrl: string | null;

  @ApiProperty({
    description: 'false si el producto fue retirado del catálogo',
  })
  @Column({ default: true })
  isActive: boolean;

  /** Fecha y hora de creación del registro. */
  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  /** Fecha y hora de la última modificación del registro. */
  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  /** Relación de uno a muchos: un producto del catálogo maestro puede poseer múltiples ofertas asociadas. */
  @OneToMany(() => Offert, (offert) => offert.product)
  offerts: Relation<Offert[]>;
}
