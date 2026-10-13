import { BadRequestException } from '@nestjs/common';
import { AiClassification, qualityToStore } from '../../src/offerts/ai-quality';
import { AiQuality } from '../../src/entities/offert.entity';

// El modelo de visión artificial detecta tres estados, pero solo Buena y Regular llegan a la BD
describe('qualityToStore', () => {
  it('Debe guardar la calidad Regular que asigna la IA', () => {
    // Arrange
    const clasificacion = AiClassification.REGULAR;

    // Act
    const calidad = qualityToStore(clasificacion);

    // Assert
    expect(calidad).toBe(AiQuality.REGULAR);
  });

  it('Debe rechazar un producto clasificado como Malo: no se puede vender', () => {
    // Arrange: un producto podrido no se puede ofertar
    const clasificacion = AiClassification.MALA;

    // Act
    const action = () => qualityToStore(clasificacion);

    // Assert
    expect(action).toThrow(BadRequestException);
  });
});
