import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDTO } from '../../../src/auth/dto/register.dto';
import { DocumentType, UserRole } from '../../../src/entities/user.entity';

describe('RegisterDTO', () => {
  // Datos válidos de base: cada test cambia solo el campo que quiere probar
  const datosValidos = {
    name: 'Juan Pérez',
    documentType: DocumentType.CC,
    documentNumber: '1020304050',
    email: 'juan@agrotrace.com',
    phone: '3001234567',
    password: 'Segura123',
    address: 'Calle 10 # 20-30',
    municipality: 'Envigado',
    role: UserRole.AGRICULTOR,
  };

  // Devuelve los nombres de los campos que fallaron la validación
  const camposConError = async (datos: object) => {
    const errores = await validate(plainToInstance(RegisterDTO, datos));
    return errores.map((error) => error.property);
  };

  it('acepta datos válidos', async () => {
    expect(await camposConError(datosValidos)).toEqual([]);
  });

  it('rechaza un nombre vacío', async () => {
    expect(await camposConError({ ...datosValidos, name: '' })).toContain(
      'name',
    );
  });

  it('rechaza un tipo de documento inválido', async () => {
    expect(
      await camposConError({ ...datosValidos, documentType: 'TI' }),
    ).toContain('documentType');
  });

  it('acepta un NIT con dígito de verificación', async () => {
    expect(
      await camposConError({ ...datosValidos, documentNumber: '900123456-7' }),
    ).toEqual([]);
  });

  it('rechaza un número de documento con letras', async () => {
    expect(
      await camposConError({ ...datosValidos, documentNumber: '12AB34' }),
    ).toContain('documentNumber');
  });

  it('rechaza un correo inválido', async () => {
    expect(await camposConError({ ...datosValidos, email: 'juan@' })).toContain(
      'email',
    );
  });

  it('rechaza un teléfono inválido', async () => {
    expect(await camposConError({ ...datosValidos, phone: '123' })).toContain(
      'phone',
    );
  });

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    expect(
      await camposConError({ ...datosValidos, password: 'Abc123' }),
    ).toContain('password');
  });

  it('rechaza una dirección vacía', async () => {
    expect(await camposConError({ ...datosValidos, address: '' })).toContain(
      'address',
    );
  });

  it('rechaza un municipio distinto de Envigado', async () => {
    // Arrange: por ahora agrotrace solo opera en Envigado
    const datos = { ...datosValidos, municipality: 'Medellín' };

    // Act
    const campos = await camposConError(datos);

    // Assert
    expect(campos).toContain('municipality');
  });

  it('rechaza un rol inválido', async () => {
    expect(await camposConError({ ...datosValidos, role: 'Admin' })).toContain(
      'role',
    );
  });
});
