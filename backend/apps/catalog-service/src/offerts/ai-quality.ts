import { BadRequestException } from '@nestjs/common';
import { AiQuality } from '../entities/offert.entity';

/**
 * Estados de clasificación detectados por el modelo de inteligencia artificial (ai-service).
 */
export enum AiClassification {
  BUENA = 'Fresh',
  REGULAR = 'Mild',
  MALA = 'Rotten',
}

/**
 * Convierte la clasificación otorgada por el modelo de IA al formato de calidad apto para almacenamiento.
 * Nota: Un producto clasificado como "Malo" se considera podrido, por lo que se rechaza inmediatamente
 * impidiendo su registro en la base de datos.
 * @param classification - Resultado emitido por el modelo de visión artificial.
 * @returns Calidad válida para guardar en la entidad (Buena o Regular).
 * @throws `BadRequestException` Si el producto es clasificado en estado 'Mala'.
 */
export function qualityToStore(classification: AiClassification): AiQuality {
  if (classification === AiClassification.MALA) {
    throw new BadRequestException(
      'El producto fue clasificado como en mal estado y no se puede vender',
    );
  }
  return classification === AiClassification.BUENA
    ? AiQuality.BUENA
    : AiQuality.REGULAR;
}
