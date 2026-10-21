import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entitie';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * Servicio encargado de gestionar toda la lógica de negocio del catálogo maestro de productos.
 */
@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Crea un nuevo producto en el catálogo maestro validando la unicidad de su nombre.
   * @param {CreateProductDto} dto - Datos necesarios para la creación del producto.
   * @returns {Promise<Product>} El producto creado y almacenado.
   * @throws {ConflictException} Si ya existe un producto registrado con el mismo nombre.
   */
  async create(dto: CreateProductDto): Promise<Product> {
    // El nombre es único en el catálogo maestro
    const exists = await this.productRepository.existsBy({ name: dto.name });
    if (exists) {
      throw new ConflictException('A product with this name already exists');
    }

    return this.productRepository.save(this.productRepository.create(dto));
  }

  /**
   * Obtiene la lista completa de todos los productos activos del catálogo, ordenados alfabéticamente por nombre.
   * @returns {Promise<Product[]>} Lista de productos activos.
   */
  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Busca un producto específico del catálogo utilizando su identificador único.
   * @param {string} productId - Identificador único del producto en formato UUID.
   * @returns {Promise<Product>} La entidad del producto encontrado.
   * @throws {NotFoundException} Si el producto no es encontrado.
   */
  async findOne(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { ProductId: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  /**
   * Actualiza los datos de un producto existente en el catálogo.
   * @param {string} productId - Identificador único del producto.
   * @param {UpdateProductDto} dto - Datos a actualizar.
   * @returns {Promise<Product>} El producto actualizado.
   */
  async update(productId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(productId);
    return this.productRepository.save({ ...product, ...dto });
  }

  /**
   * Realiza un borrado lógico de un producto del catálogo (cambia su estado isActive a false).
   * @param {string} productId - Identificador único del producto.
   * @returns {Promise<Product>} El producto con su estado inactivo guardado.
   */
  async remove(productId: string): Promise<Product> {
    const product = await this.findOne(productId);
    product.isActive = false;
    return this.productRepository.save(product);
  }

  /**
   * Verifica la existencia y disponibilidad activa de un producto (utilizado por OffertsService).
   * @param {string} productId - Identificador único del producto.
   * @returns {Promise<boolean>} True si el producto existe y está activo, de lo contrario false.
   */
  async productExists(productId: string): Promise<boolean> {
    return this.productRepository.existsBy({
      ProductId: productId,
      isActive: true,
    });
  }
}
