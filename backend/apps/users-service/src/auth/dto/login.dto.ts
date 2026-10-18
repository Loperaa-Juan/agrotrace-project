import { IsEmail, IsString, MinLength } from 'class-validator';
/**
 * DTO que confirma el usuario y contraseña para permitir el login
 */
export class LoginDTO {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
