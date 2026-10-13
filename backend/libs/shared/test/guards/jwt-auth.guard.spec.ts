import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../../src/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: any;

  // Payload tal como lo firma AuthService al generar el access token
  const payload = {
    sub: 'uuid-123',
    email: 'juan@agrotrace.com',
    role: 'Agricultor',
  };

  // Simula el contexto de Nest para una petición HTTP con los headers recibidos
  const contextoCon = (request: any) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };

    guard = new JwtAuthGuard(jwtService);
  });

  it('Debe permitir el acceso con un token válido', async () => {
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request = { headers: { authorization: 'Bearer token-valido' } };

    expect(await guard.canActivate(contextoCon(request))).toBe(true);
  });

  it('Debe guardar el payload del token en request.user', async () => {
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request: any = { headers: { authorization: 'Bearer token-valido' } };

    await guard.canActivate(contextoCon(request));

    expect(request.user).toEqual(payload);
  });

  it('Debe lanzar UnauthorizedException si no se envía el header Authorization', async () => {
    const request = { headers: {} };

    await expect(guard.canActivate(contextoCon(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Debe lanzar UnauthorizedException si el token no es de tipo Bearer', async () => {
    const request = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };

    await expect(guard.canActivate(contextoCon(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('Debe lanzar UnauthorizedException si el token es inválido o expiró', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const request = { headers: { authorization: 'Bearer token-vencido' } };

    await expect(guard.canActivate(contextoCon(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
