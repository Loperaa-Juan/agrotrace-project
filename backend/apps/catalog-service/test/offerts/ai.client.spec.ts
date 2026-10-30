import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiClient } from '../../src/offerts/ai.client';

describe('AiClient', () => {
  let client: AiClient;
  let fetchMock: jest.SpyInstance;

  // Foto de la fruta que sube el agricultor
  const image: any = {
    buffer: Buffer.from('foto'),
    mimetype: 'image/jpeg',
    originalname: 'tomate.jpg',
  };

  const prediction = {
    class: 'Fresh',
    confidence: 0.98,
    original_url: 'https://bucket.s3.us-east-2.amazonaws.com/original/foto.jpeg',
    annotated_url:
      'https://bucket.s3.us-east-2.amazonaws.com/annotated/foto.jpeg',
  };

  beforeEach(() => {
    client = new AiClient();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('Debe retornar la predicción que responde el ai-service', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response(JSON.stringify(prediction)));

    // Act
    const result = await client.classify(image);

    // Assert
    expect(result).toEqual(prediction);
  });

  it('Debe rechazar la imagen si el ai-service no detecta ninguna fruta', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'No se detectó ninguna fruta' }), {
        status: 422,
      }),
    );

    // Act
    const action = client.classify(image);

    // Assert
    await expect(action).rejects.toThrow(BadRequestException);
  });

  it('Debe responder 503 si el ai-service no está disponible', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    // Act
    const action = client.classify(image);

    // Assert
    await expect(action).rejects.toThrow(ServiceUnavailableException);
  });

  it('Debe responder 503 si el ai-service falla', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('error', { status: 500 }));

    // Act
    const action = client.classify(image);

    // Assert
    await expect(action).rejects.toThrow(ServiceUnavailableException);
  });
});
