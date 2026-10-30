import { describe, it, expect, vi } from 'vitest';
import { simularApi } from './utils';

describe('simularApi', () => {
  it('trata una petición sin opciones como GET', async () => {
    // Arrange
    const fetchMock = vi.fn();
    simularApi(fetchMock, { 'GET /catalog': [200, [{ name: 'Aguacate' }]] });

    // Act
    const respuesta = await fetchMock('http://localhost/catalog');

    // Assert
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual([{ name: 'Aguacate' }]);
  });

  it('responde con un objeto vacío cuando la respuesta no tiene cuerpo', async () => {
    // Arrange
    const fetchMock = vi.fn();
    simularApi(fetchMock, { 'DELETE /offerts': [200] });

    // Act
    const respuesta = await fetchMock('http://localhost/offerts', { method: 'DELETE' });

    // Assert
    expect(await respuesta.json()).toEqual({});
  });

  it('rechaza las peticiones que no tienen respuesta definida', async () => {
    // Arrange
    const fetchMock = vi.fn();
    simularApi(fetchMock, {});

    // Act
    const peticion = fetchMock('http://localhost/orders', { method: 'POST' });

    // Assert
    await expect(peticion).rejects.toThrow('Sin respuesta para POST /orders');
  });
});
