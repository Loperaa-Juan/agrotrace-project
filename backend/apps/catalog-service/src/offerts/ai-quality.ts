import { BadRequestException } from '@nestjs/common';
import { AiQuality } from '../entities/offert.entity';

// Estados que detecta el modelo de visión artificial (ai-service)
export enum AiClassification {
  BUENA = 'Buena',
  REGULAR = 'Regular',
  MALA = 'Mala',
}

// Convierte la clasificación del modelo en la calidad que se guarda en la oferta.
// Un producto clasificado como Malo está podrido: no se puede ofertar y nunca llega a la BD.
// Se usará al crear la oferta, cuando catalog-service consulte a ai-service con la foto
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
