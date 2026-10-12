import { plainToInstance } from 'class-transformer';
import { LoginDTO } from '../../../src/auth/dto/login.dto';
import { validate } from 'class-validator';

describe('LoginDTO', () => {
  // Preparamos el sujeto de pruebas de como se debe ver un objeto de login
  const payload = {
    email: 'juan@agrotrace.com',
    password: 'segura123',
  };

  it('Debe aceptar un email con formato correcto', async () => {
    const dto = plainToInstance(LoginDTO, {
      email: payload.email,
      password: payload.password,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('Debe rechazar passwords de menos de 6 letras', async () => {
    const dto = plainToInstance(LoginDTO, {
      email: payload.email,
      password: 'Juan',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('Debe aceptar una contraseña de más de 6 caracteres', async () => {
    const dto = plainToInstance(LoginDTO, {
      email: payload.email,
      password: payload.password,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
