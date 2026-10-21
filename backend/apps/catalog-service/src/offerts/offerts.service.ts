import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ValidationService } from '@app/shared';
import { Offert } from '../entities/offert.entity';
import { CatalogService } from '../catalog/catalog.service';
import { CreateOffertDto } from './dto/create-offert.dto';
import { UpdateOffertDto } from './dto/update-offert.dto';

/**
 * Interfaz que define los datos esenciales de una oferta requeridos por orders-service para procesar un pedido.
 */
export interface OffertSummary {
  OffertId: string;
  farmerId: string;
  pricePerUnit: number;
  availableQuantity: number;
  unitOfMeasure: string;
}

/**
 * Servicio encargado de gestionar toda la lógica de negocio de las ofertas publicadas por los agricultores.
 */
@Injectable()
export class OffertsService {
  constructor(
    @InjectRepository(Offert)
    private readonly offertRepository: Repository<Offert>,
    private readonly validationService: ValidationService,
    private readonly catalogService: CatalogService,
  ) {}

  /**
   * Crea una nueva oferta validando la existencia del agricultor vía TCP (users-service) 
   * y que el producto pertenezca al catálogo activo de este servicio.
   * @param {string} farmerId - Identificador del agricultor que publica.
   * @param {CreateOffertDto} dto - Datos de la oferta.
   * @returns {Promise<Offert>} La oferta creada.
   * @throws {NotFoundException} Si el producto asociado no existe o está inactivo.
   */
  async create(farmerId: string, dto: CreateOffertDto): Promise<Offert> {
    await this.validationService.validateUserExists(farmerId);
    if (!(await this.catalogService.productExists(dto.productId))) {
      throw new NotFoundException('Product not found or inactive');
    }

    return this.offertRepository.save(
      this.offertRepository.create({ ...dto, farmerId }),
    );
  }

  /**
   * Obtiene todas las ofertas activas visibles para los compradores (opcionalmente filtradas por un producto).
   * @param {string} [productId] - Identificador opcional del producto para filtrar.
   * @returns {Promise<Offert[]>} Lista de ofertas activas.
   */
  async findAll(productId?: string): Promise<Offert[]> {
    return this.offertRepository.find({
      where: productId ? { isActive: true, productId } : { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Consulta todas las ofertas publicadas por un agricultor específico, incluyendo las que se encuentren retiradas.
   * @param {string} farmerId - Identificador único del agricultor.
   * @returns {Promise<Offert[]>} Lista de ofertas del agricultor.
   */
  async findMine(farmerId: string): Promise<Offert[]> {
    return this.offertRepository.find({
      where: { farmerId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Actualiza una oferta asegurando que pertenezca al agricultor que realiza la petición.
   * @param {string} offertId - Identificador de la oferta.
   * @param {string} farmerId - Identificador del agricultor propietario.
   * @param {UpdateOffertDto} dto - Datos a actualizar.
   * @returns {Promise<Offert>} La oferta actualizada.
   */
  async update(
    offertId: string,
    farmerId: string,
    dto: UpdateOffertDto,
  ): Promise<Offert> {
    const offert = await this.findOwnOffert(offertId, farmerId);
    return this.offertRepository.save({ ...offert, ...dto });
  }

  /**
   * Realiza un borrado lógico de una oferta propia (cambia su estado isActive a false).
   * @param {string} offertId - Identificador de la oferta.
   * @param {string} farmerId - Identificador del agricultor propietario.
   * @returns {Promise<Offert>} La oferta modificada a inactiva.
   */
  async remove(offertId: string, farmerId: string): Promise<Offert> {
    const offert = await this.findOwnOffert(offertId, farmerId);
    offert.isActive = false;
    return this.offertRepository.save(offert);
  }

  /**
   * Busca una oferta verificando estrictamente que pertenezca al agricultor autenticado.
   * @private
   * @param {string} offertId - Identificador de la oferta.
   * @param {string} farmerId - Identificador del agricultor.
   * @returns {Promise<Offert>} La entidad de la oferta encontrada.
   * @throws {NotFoundException} Si la oferta no existe.
   * @throws {ForbiddenException} Si la oferta pertenece a otro agricultor.
   */
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

  /**
   * Utilizado por orders-service (vía TCP): valida y retorna una oferta activa de un producto activo.
   * Retorna null si no existe para que el servicio solicitante devuelva un error 404.
   * @param {string} offertId - Identificador de la oferta.
   * @returns {Promise<OffertSummary | null>} Resumen de la oferta o null.
   */
  async getActiveOffert(offertId: string): Promise<OffertSummary | null> {
    const offert = await this.offertRepository.findOne({
      where: {
        OffertId: offertId,
        isActive: true,
        product: { isActive: true },
      },
      relations: { product: true },
    });
    if (!offert) {
      return null;
    }
    return {
      OffertId: offert.OffertId,
      farmerId: offert.farmerId,
      pricePerUnit: offert.pricePerUnit,
      availableQuantity: offert.availableQuantity,
      unitOfMeasure: offert.product.unitOfMeasure,
    };
  }

  /**
   * Utilizado por orders-service (vía TCP) al aceptar un pedido para descontar stock de forma segura.
   * Emplea condiciones atómicas en el UPDATE para manejar concurrencia.
   * @param {string} offertId - Identificador de la oferta.
   * @param {number} quantity - Cantidad a descontar.
   * @returns {Promise<boolean>} True si se descontó con éxito, false si no hubo stock suficiente.
   */
  async decreaseQuantity(offertId: string, quantity: number): Promise<boolean> {
    const result = await this.offertRepository.update(
      {
        OffertId: offertId,
        isActive: true,
        availableQuantity: MoreThanOrEqual(quantity),
      },
      {
        availableQuantity: () => `"availableQuantity" - ${Number(quantity)}`,
      },
    );
    if (!result.affected) {
      return false;
    }

    // Si se agotó, la oferta deja de mostrarse a los compradores
    await this.offertRepository.update(
      { OffertId: offertId, availableQuantity: 0 },
      { isActive: false },
    );
    return true;
  }
}
