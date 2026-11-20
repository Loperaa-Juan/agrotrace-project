import { describe, it, expect } from 'vitest';
import { validarRegistro } from '../../src/routes/register';

describe('validarRegistro', () => {
  // Datos válidos de base: cada test cambia solo el campo que quiere probar
  const datosValidos = {
    nombre: 'Restaurante El Fogón',
    tipoDocumento: 'CC' as const,
    numeroDocumento: '1020304050',
    correo: 'fogon@agrotrace.com',
    telefono: '3001234567',
    clave: 'SeguraAgrotrace1',
    direccion: 'Calle 10 # 20-30',
    municipio: 'Envigado',
  };

  it('rechaza un tipo de documento que no aplica para el perfil', () => {
    // Act
    const errores = validarRegistro(datosValidos, ['NIT']);

    // Assert
    expect(errores).toEqual({ tipoDocumento: 'Este tipo de documento no aplica para tu perfil' });
  });

  it('rechaza una contraseña de menos de 15 caracteres', () => {
    // Arrange
    const datos = { ...datosValidos, clave: 'a'.repeat(14) };

    // Act
    const errores = validarRegistro(datos, ['CC']);

    // Assert
    expect(errores).toEqual({ clave: 'La contraseña debe tener entre 15 y 72 caracteres' });
  });

  it('acepta una contraseña de exactamente 15 caracteres', () => {
    // Arrange
    const datos = { ...datosValidos, clave: 'a'.repeat(15) };

    // Act
    const errores = validarRegistro(datos, ['CC']);

    // Assert
    expect(errores).toEqual({});
  });
});
