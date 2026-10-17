import { describe, it, expect, vi, afterEach } from 'vitest';

describe('config/env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('expone las URLs de los microservicios desde las variables de entorno', async () => {
    // Act
    const env = await import('../../src/config/env');

    // Assert
    expect(env.USERS_API_URL).toBe('http://users.test');
    expect(env.CATALOG_API_URL).toBe('http://catalog.test');
    expect(env.ORDERS_API_URL).toBe('http://orders.test');
  });

  it('falla si falta una variable de entorno', async () => {
    // Arrange
    vi.stubEnv('VITE_CATALOG_API_URL', '');
    vi.resetModules();

    // Act & Assert
    await expect(import('../../src/config/env')).rejects.toThrow('VITE_CATALOG_API_URL');
  });
});
