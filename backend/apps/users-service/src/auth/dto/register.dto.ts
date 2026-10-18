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

  // Por ahora agrotrace solo opera en Envigado. Las ofertas del agricultor quedan en su municipio
  @IsIn(MUNICIPIOS_PERMITIDOS, {
    message: 'Por ahora agrotrace solo opera en Envigado',
  })
  municipality: string;

  // Admin no se puede elegir al registrarse: se asigna directamente en la BD
  @IsIn(ROLES_DE_REGISTRO, {
    message: 'El rol debe ser Agricultor, Persona o Negocio',
  })
  role: UserRole;
}
