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
} from 'typeorm';

// Categorías de productos agrícolas del catálogo (Estas serán cambiadas cuando entrenemos el modelo de Visión Artificial
// ya que esta dependerá de las categorías que vea el modelo durante el entrenamiento)
export enum ProductCategory {
  FRUTAS = 'Frutas',
  VERDURAS = 'Verduras',
  HORTALIZAS = 'Hortalizas',
  TUBERCULOS = 'Tubérculos',
  GRANOS = 'Granos',
  CEREALES = 'Cereales',
}

// Unidad en la que se comercializa el producto
export enum UnitOfMeasure {
  LIBRA = 'lb',
  KILOGRAMO = 'kg',
  GRAMO = 'g',
  UNIDAD = 'unidad',
}

// Cada oferta de un agricultor (precio, cantidad, disponibilidad) debe referenciar un producto de este catálogo.
// Las ofertas viven en offerts-service y referencian el producto por su ProductId.
@Entity('product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  ProductId: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ProductCategory })
  category: ProductCategory;

  @Column({ type: 'enum', enum: UnitOfMeasure, default: UnitOfMeasure.LIBRA })
  unitOfMeasure: UnitOfMeasure;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // URL de la imagen de referencia del producto
  // @Column({ type: "varchar", nullable: true })
  // referenceImageUrl: string | null;

  // Estado del producto: si está inactivo (borrado lógico) no admite nuevas ofertas
  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
