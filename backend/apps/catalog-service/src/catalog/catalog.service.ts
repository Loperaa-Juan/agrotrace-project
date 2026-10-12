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

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    // El nombre es único en el catálogo maestro
    const exists = await this.productRepository.existsBy({ name: dto.name });
    if (exists) {
      throw new ConflictException('A product with this name already exists');
    }

    return this.productRepository.save(this.productRepository.create(dto));
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { ProductId: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(productId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(productId);
    return this.productRepository.save({ ...product, ...dto });
  }

  // Borrado lógico: el producto puede tener ofertas asociadas
  async remove(productId: string): Promise<Product> {
    const product = await this.findOne(productId);
    product.isActive = false;
    return this.productRepository.save(product);
  }
}
