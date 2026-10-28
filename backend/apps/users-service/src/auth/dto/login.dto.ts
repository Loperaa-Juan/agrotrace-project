import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
/**
 * DTO que confirma el usuario y contraseña para permitir el login
 */
export class LoginDTO {
  /** Correo con el que se registró el usuario. */
  @ApiProperty({ format: 'email', example: 'juan@agrotrace.com' })
  @IsEmail()
  email: string;

  /** Contraseña del usuario (mínimo 6 caracteres). */
  @ApiProperty({ minLength: 6, example: 'Secreta123' })
  @IsString()
  @MinLength(6)
  password: string;
}
