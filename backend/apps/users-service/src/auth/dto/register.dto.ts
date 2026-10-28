import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentType, UserRole } from '../../entities/user.entity';

/**
 * Lista de municipios permitidos temporalmente para el registro en AgroTrace.
 */
const MUNICIPIOS_PERMITIDOS = ['Envigado'];

/**
 * Roles permitidos que un usuario puede seleccionar al registrarse de forma autónoma.
 */
const ROLES_DE_REGISTRO = [
  UserRole.AGRICULTOR,
  UserRole.PERSONA,
  UserRole.NEGOCIO,
];

/**
 * DTO que define, encapsula y valida los datos obligatorios y opcionales
 * requeridos al momento del registro de un nuevo usuario en la plataforma.
 */
export class RegisterDTO {
  /** Nombre completo del usuario (máximo 100 caracteres). */
  @ApiProperty({ example: 'Juan Pérez', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** Tipo de documento: CC, NIT o CE. */
  @ApiProperty({ enum: DocumentType, example: DocumentType.CC })
  @IsEnum(DocumentType, {
    message: 'El tipo de documento debe ser CC, NIT o CE',
  })
  documentType: DocumentType;

  /** Número de documento, solo dígitos (5 a 15). */
  @ApiProperty({ example: '1020304050' })
  // Solo dígitos; el NIT puede incluir el dígito de verificación (ej. 900123456-7)
  @Matches(/^\d{5,15}(-\d)?$/, {
    message: 'El número de documento no es válido',
  })
  documentNumber: string;

  /** Correo electrónico único del usuario. */
  @ApiProperty({ format: 'email', example: 'juan@agrotrace.com' })
  @IsEmail({}, { message: 'El correo no es válido' })
  email: string;

  /** Teléfono colombiano. */
  @ApiProperty({ example: '+573001234567' })
  @IsPhoneNumber('CO', {
    message: 'El teléfono no es un número colombiano válido',
  })
  phone: string;

  /** Contraseña (entre 8 y 72 caracteres). */
  @ApiProperty({ minLength: 8, maxLength: 72, example: 'Secreta123' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  password: string;

  /** Dirección de residencia o del negocio (máximo 255 caracteres). */
  @ApiProperty({ example: 'Calle 37 Sur #43A-10', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  /** Municipio donde opera el usuario. */
  @ApiProperty({ enum: MUNICIPIOS_PERMITIDOS, example: 'Envigado' })
  // Por ahora agrotrace solo opera en Envigado. Las ofertas del agricultor quedan en su municipio
  @IsIn(MUNICIPIOS_PERMITIDOS, {
    message: 'Por ahora agrotrace solo opera en Envigado',
  })
  municipality: string;

  /** Rol elegido al registrarse. */
  @ApiProperty({ enum: ROLES_DE_REGISTRO, example: UserRole.AGRICULTOR })
  // Admin no se puede elegir al registrarse: se asigna directamente en la BD
  @IsIn(ROLES_DE_REGISTRO, {
    message: 'El rol debe ser Agricultor, Persona o Negocio',
  })
  role: UserRole;
}
