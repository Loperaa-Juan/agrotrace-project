import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ValidationService } from '@app/shared';
import { Offert } from '../entities/offert.entity';
import { CatalogService } from '../catalog/catalog.service';
import { CreateOffertDto } from './dto/create-offert.dto';
import { UpdateOffertDto } from './dto/update-offert.dto';

@Injectable()
export class OffertsService {
  constructor(
    @InjectRepository(Offert)
    private readonly offertRepository: Repository<Offert>,
    private readonly validationService: ValidationService,
    private readonly catalogService: CatalogService,
  ) {}

  // El agricultor vive en users-service (se valida por TCP); el producto, en el catálogo de este servicio
  async create(farmerId: string, dto: CreateOffertDto): Promise<Offert> {
    await this.validationService.validateUserExists(farmerId);
    if (!(await this.catalogService.productExists(dto.productId))) {
      throw new NotFoundException('Product not found or inactive');
    }

    return this.offertRepository.save(
      this.offertRepository.create({ ...dto, farmerId }),
    );
  }

  // Ofertas visibles para los compradores, opcionalmente de un solo producto
  async findAll(productId?: string): Promise<Offert[]> {
    return this.offertRepository.find({
      where: productId ? { isActive: true, productId } : { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Todas las ofertas del agricultor, incluidas las retiradas
  async findMine(farmerId: string): Promise<Offert[]> {
    return this.offertRepository.find({
      where: { farmerId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    offertId: string,
    farmerId: string,
    dto: UpdateOffertDto,
  ): Promise<Offert> {
    const offert = await this.findOwnOffert(offertId, farmerId);
    return this.offertRepository.save({ ...offert, ...dto });
  }

  // Borrado lógico: la oferta deja de mostrarse pero queda en la BD
  async remove(offertId: string, farmerId: string): Promise<Offert> {
    const offert = await this.findOwnOffert(offertId, farmerId);
    offert.isActive = false;
    return this.offertRepository.save(offert);
  }

  // Busca la oferta y verifica que pertenezca al agricultor que la quiere modificar
  private async findOwnOffert(
    offertId: string,
    farmerId: string,
  ): Promise<Offert> {
    const offert = await this.offertRepository.findOne({
      where: { OffertId: offertId },
    });
    if (!offert) {
      throw new NotFoundException('Offert not found');
    }
    if (offert.farmerId !== farmerId) {
      throw new ForbiddenException('You can only modify your own offerts');
    }
    return offert;
  }
}
