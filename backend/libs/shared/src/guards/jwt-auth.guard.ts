import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Guard que valida el access token (`Authorization: Bearer <token>`) y deja su payload en `request.user`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * @param jwtService - Servicio de Nest para verificar la firma y expiración del JWT.
   */
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Verifica el token de la petición HTTP y guarda su payload en `request.user`.
   * @param context - Contexto de ejecución de la petición actual.
   * @returns `true` si el token es válido.
   * @throws {@link UnauthorizedException} Si falta el header, no es de tipo Bearer, o el token es inválido o expiró.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    try {
      request.user = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }
}
