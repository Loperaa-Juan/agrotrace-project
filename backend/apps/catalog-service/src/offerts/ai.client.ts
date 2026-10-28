import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiClassification } from './ai-quality';

/**
 * Respuesta del endpoint POST /predict del ai-service.
 */
export interface AiPrediction {
  class: AiClassification;
  confidence: number;
  original_key: string;
  annotated_key: string;
}

/**
 * Cliente HTTP del ai-service: envía la foto de la fruta para clasificarla y almacenarla en S3.
 */
@Injectable()
export class AiClient {
  /**
   * Envía la imagen al ai-service y retorna su clasificación junto con las llaves de S3.
   * @param image - Archivo de la foto recibido en la petición.
   * @returns La predicción del modelo.
   * @throws `BadRequestException` Si el ai-service rechaza la imagen (sin fruta, tipo o tamaño inválido).
   * @throws `ServiceUnavailableException` Si el ai-service no responde o falla.
   */
  async classify(image: Express.Multer.File): Promise<AiPrediction> {
    const form = new FormData();
    form.append(
      'image',
      new Blob([new Uint8Array(image.buffer)], { type: image.mimetype }),
      image.originalname,
    );

    let response: Response;
    try {
      response = await fetch(`${process.env.AI_SERVICE_URL}/predict`, {
        method: 'POST',
        body: form,
      });
    } catch {
      throw new ServiceUnavailableException('ai-service no responde');
    }

    if (response.status === 400 || response.status === 422) {
      const body = (await response.json().catch(() => ({}))) as {
        detail?: string;
      };
      throw new BadRequestException(body.detail ?? 'La imagen no es válida');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('ai-service no responde');
    }
    return (await response.json()) as AiPrediction;
  }
}
