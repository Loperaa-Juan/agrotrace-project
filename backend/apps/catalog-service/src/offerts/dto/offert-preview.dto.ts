import { ApiProperty } from '@nestjs/swagger';
import { AiQuality } from '../../entities/offert.entity';

/**
 * Resultado de clasificar la foto de una cosecha antes de publicarla (no crea ninguna oferta).
 */
export class OffertPreview {
  /** Calidad asignada por la IA; `null` si la fruta está en mal estado y no se puede vender. */
  @ApiProperty({
    enum: AiQuality,
    nullable: true,
    description:
      'Calidad asignada por la IA. null si la fruta está en mal estado y no se puede vender',
  })
  aiQuality: AiQuality | null;

  /** Probabilidad (0-1) de la clase que predijo el modelo. */
  @ApiProperty({ example: 0.97, description: 'Confianza de la predicción (0-1)' })
  confidence: number;

  /** URL pública de la foto con el recuadro que dibujó la IA sobre la fruta. */
  @ApiProperty({
    example:
      'https://test-agrotrace.s3.us-east-2.amazonaws.com/annotated/6f1c2a52-3b0e-4c53-9d57-0a4f2f6d1c11.jpeg',
  })
  annotatedImageUrl: string;
}
