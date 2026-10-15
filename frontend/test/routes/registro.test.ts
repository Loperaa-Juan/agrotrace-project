import { describe, it, expect } from 'vitest';
import { validarRegistro } from '../../src/routes/registro';

describe('validarRegistro', () => {
  it('rechaza un tipo de documento que no aplica para el perfil', () => {
    // Arrange
    const datos = {
      nombre: 'Restaurante El Fogón',
      tipoDocumento: 'CC' as const,
      numeroDocumento: '1020304050',
      correo: 'fogon@agrotrace.com',
      telefono: '3001234567',
      clave: 'Segura123',
      direccion: 'Calle 10 # 20-30',
      municipio: 'Envigado',
    };

    // Act
    const errores = validarRegistro(datos, ['NIT']);

    // Assert
    expect(errores).toEqual({ tipoDocumento: 'Este tipo de documento no aplica para tu perfil' });
  });
});
