import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RefreshDTO } from '../../../src/auth/dto/refresh.dto';

describe('Refresh Token DTO', () => {
  it('Debe fallar si el refresh token falta', async () => {
    const dto = plainToInstance(RefreshDTO, {});
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('El refresh token debe ser un string', async () => {
    const dto = plainToInstance(RefreshDTO, {
      refreshToken: 'valid-refresh-token',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
