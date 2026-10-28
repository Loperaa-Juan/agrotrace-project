import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

/**
 * Resumen de los datos de la oferta obtenidos mediante TCP desde catalog-service.
 */
export interface OffertSummary {
  OffertId: string;
  farmerId: string;
  pricePerUnit: number;
  availableQuantity: number;
  unitOfMeasure: string; // Unidad del producto ofertado: lb, kg, g o unidad
}

/**
 * Cliente TCP encargado de consultar y gestionar las ofertas con el microservicio de catálogo.
 */
@Injectable()
export class CatalogClient {
  constructor(
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
  ) {}

  /**
   * Obtiene la información de una oferta específica a través de TCP.
   * @param offertId - Identificador único de la oferta.
   * @returns Resumen con los datos de la oferta.
   * @throws {@link NotFoundException} Si la oferta no existe o está inactiva.
   */
  async getOffert(offertId: string): Promise<OffertSummary> {
    const offert = await this.send<OffertSummary | null>(
      'get_offert',
      offertId,
    );
    if (!offert) {
      throw new NotFoundException('Offert not found or inactive');
    }
    return offert;
  }

  /**
   * Disminuye la cantidad disponible de una oferta en el catálogo (al aceptar un pedido).
   * @param offertId - Identificador de la oferta.
   * @param quantity - Cantidad a descontar.
   * @returns   * @throws {@link BadRequestException} Si no hay suficiente cantidad disponible.
   */
  async decreaseOffertQuantity(
    offertId: string,
    quantity: number,
  ): Promise<void> {
    const decreased = await this.send<boolean>('decrease_offert_quantity', {
      offertId,
      quantity,
    });
    if (!decreased) {
      throw new BadRequestException('Not enough quantity available');
    }
  }

  /**
   * Método privado para enviar mensajes por TCP al microservicio de catálogo con manejo de errores.
   * @typeParam T - Tipo de la respuesta esperada del servicio.
   * @param pattern - Patrón del mensaje RPC.
   * @param payload - Datos de la petición.
   * @returns Respuesta del servicio.
   * @throws {@link ServiceUnavailableException} Si catalog-service no responde.
   */
  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.catalogClient.send<T>(pattern, payload));
    } catch {
      throw new ServiceUnavailableException('Catalog service is unavailable');
    }
  }
}
