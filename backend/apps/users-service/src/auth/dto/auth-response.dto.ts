import type { DocumentType, User, UserRole } from '../../entities/user.entity';

// Datos públicos del usuario
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

export class AuthResponseDto {
  // JWT de acceso
  accessToken: string;

  // Token para obtener un nuevo accessToken sin volver a iniciar sesión
  refreshToken: string;

  user: AuthUserDto;
}

// Convierte la entidad en datos públicos (sin contraseña ni tokens)
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
