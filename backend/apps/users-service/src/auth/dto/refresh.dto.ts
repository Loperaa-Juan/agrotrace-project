import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
/**
 * DTO que actualiza los tokens de sesiones activas haciendo uso de la clase RefreshToken
 */
export class RefreshDTO {
  /** Token de refresco que se recibió al iniciar sesión o en la última renovación. */
  @ApiProperty({ description: 'Token de refresco vigente de la sesión' })
  @IsString()
  readonly refreshToken: string;
}
