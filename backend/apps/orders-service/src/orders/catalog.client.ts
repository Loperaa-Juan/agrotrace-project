import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

// Datos de la oferta que necesita un pedido. Vienen de catalog-service
export interface OffertSummary {
  OffertId: string;
  farmerId: string;
  pricePerUnit: number;
  availableQuantity: number;
  unitOfMeasure: string; // Unidad del producto ofertado: lb, kg, g o unidad
}

// Consulta por TCP las ofertas de catalog-service
@Injectable()
export class CatalogClient {
  constructor(
    @Inject('CATALOG_SERVICE') private readonly catalogClient: ClientProxy,
  ) {}

  // catalog-service responde null si la oferta no existe, está retirada o su producto fue desactivado
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

  // Se usa al aceptar un pedido. catalog-service responde false si la oferta ya no tiene
  // suficiente cantidad (por ejemplo, porque el agricultor aceptó otro pedido antes)
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

  // Envía un mensaje a catalog-service; si no responde, el pedido no se puede procesar
  private async send<T>(pattern: string, payload: unknown): Promise<T> {
    try {
      return await firstValueFrom(this.catalogClient.send<T>(pattern, payload));
    } catch {
      throw new ServiceUnavailableException('Catalog service is unavailable');
    }
  }
}
