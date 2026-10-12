import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentType, UserRole } from '../../entities/user.entity';

export class RegisterDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser CC, NIT o CE',
  })
  documentType: DocumentType;

  // Solo dígitos; el NIT puede incluir el dígito de verificación (ej. 900123456-7)
  @Matches(/^\d{5,15}(-\d)?$/, {
    message: 'El número de documento no es válido',
  })
  documentNumber: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  @IsPhoneNumber('CO', {
    message: 'El teléfono no es un número colombiano válido',
  })
  phone: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  municipality: string;

  @IsEnum(UserRole, {
    message: 'El rol debe ser Agricultor, Persona o Negocio',
  })
  role: UserRole;
}
