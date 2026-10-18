import { IsString } from 'class-validator';
/**
 * DTO que actualiza los tokens de sesiones activas haciendo uso de la clase RefreshToken
 */
export class RefreshDTO {
  @IsString()
  readonly refreshToken: string;
}
