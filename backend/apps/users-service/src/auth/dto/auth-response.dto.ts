import type { DocumentType, User, UserRole } from '../../entities/user.entity';

/**
 * DTO que define la estructura de los datos publicos del usuario
 * excluyendo informacion sensible (contraseña)
 */
export class AuthUserDto {
  userId: string;
  name: string;
  email: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  address: string;
  municipality: string;
  role: UserRole;
}

/**
 * DTO que encapsula la respuesta de autenticación,
 * incluyendo los tokens de acceso y los datos públicos del usuario.
 */
export class AuthResponseDto {
  // JWT de acceso
  accessToken: string;

  // Token para obtener un nuevo accessToken sin volver a iniciar sesión
  refreshToken: string;

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
