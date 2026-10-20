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
 * Interfaz que define los datos de la oferta necesarios para procesar un pedido.
 * Estos datos provienen de catalog-service.
 */
export interface OffertSummary {
  OffertId: string;
  farmerId: string;
  pricePerUnit: number;
  availableQuantity: number;
  unitOfMeasure: string; // Unidad del producto ofertado: lb, kg, g o unidad
}

/**
 * Cliente de comunicación por TCP encargado de consultar y gestionar las ofertas con el servicio de catálogo (`catalog-service`).
 */
@Injectable()
export class CatalogClient {
  constructor(
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
  ) {}

  /**
   * Consulta una oferta específica en catalog-service mediante TCP.
   * @param {string} offertId - Identificador único de la oferta.
   * @returns {Promise<OffertSummary>} Resumen de los datos de la oferta.
   * @throws {NotFoundException} Si catalog-service responde null (la oferta no existe, está retirada o el producto fue desactivado).
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
   * Disminuye la cantidad disponible de una oferta (se utiliza al aceptar un pedido).
   * @param {string} offertId - Identificador único de la oferta.
   * @param {number} quantity - Cantidad que se desea descontar.
   * @returns {Promise<void>}
   * @throws {BadRequestException} Si catalog-service responde false (no hay suficiente cantidad disponible).
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
   * Envía un mensaje por TCP a catalog-service; si este no responde, interrumpe el proceso.
   * @private
   * @template T
   * @param {string} pattern - Patrón del mensaje RPC.
   * @param {unknown} payload - Datos enviados en la petición.
   * @returns {Promise<T>} Respuesta del servicio de catálogo.
   * @throws {ServiceUnavailableException} Si el servicio de catálogo no se encuentra disponible.
   */
  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.catalogClient.send<T>(pattern, payload));
    } catch {
      throw new ServiceUnavailableException('Catalog service is unavailable');
    }
  }
}
