import { ApiProperty } from '@nestjs/swagger';
import { DocumentType, UserRole, type User } from '../../entities/user.entity';

/**
 * DTO que define la estructura de los datos publicos del usuario
 * excluyendo informacion sensible (contraseña)
 */
export class AuthUserDto {
  /** Identificador único del usuario en formato UUID. */
  @ApiProperty({ format: 'uuid' })
  userId: string;

  /** Nombre completo del usuario. */
  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  /** Correo electrónico con el que inicia sesión. */
  @ApiProperty({ format: 'email', example: 'juan@agrotrace.com' })
  email: string;

  /** Tipo de documento de identidad. */
  @ApiProperty({ enum: DocumentType, example: DocumentType.CC })
  documentType: DocumentType;

  /** Número de documento (el NIT puede incluir el dígito de verificación). */
  @ApiProperty({ example: '1020304050' })
  documentNumber: string;

  /** Teléfono de contacto. */
  @ApiProperty({ example: '+573001234567' })
  phone: string;

  /** Dirección de residencia o del negocio. */
  @ApiProperty({ example: 'Calle 37 Sur #43A-10' })
  address: string;

  /** Municipio donde opera el usuario. */
  @ApiProperty({ example: 'Envigado' })
  municipality: string;

  /** Rol del usuario en la plataforma. */
  @ApiProperty({ enum: UserRole, example: UserRole.AGRICULTOR })
  role: UserRole;
}

/**
 * DTO que encapsula la respuesta de autenticación,
 * incluyendo los tokens de acceso y los datos públicos del usuario.
 */
export class AuthResponseDto {
  /** JWT de acceso. */
  @ApiProperty({ description: 'JWT de acceso para el header Authorization' })
  accessToken: string;

  /** Token para obtener un nuevo accessToken sin volver a iniciar sesión. */
  @ApiProperty({
    description:
      'Token para obtener un nuevo accessToken sin volver a iniciar sesión',
  })
  refreshToken: string;

  /** Datos públicos del usuario autenticado. */
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

/**
 * Convierte la entidad en datos públicos
 * @param user - Entidad completa del usuario desde la base de datos.
 * @returns Objeto con los campos públicos del usuario (sin contraseña ni tokens).
 */
export function toAuthUserDto(user: User): AuthUserDto {
  return {
    userId: user.userId,
    name: user.name,
    email: user.email,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    phone: user.phone,
    address: user.address,
    municipality: user.municipality,
    role: user.role,
  };
}
