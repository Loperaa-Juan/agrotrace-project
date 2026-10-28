import { ApiProperty } from '@nestjs/swagger';

/**
 * Datos públicos del agricultor que users-service entrega a orders-service.
 * Representa el tipo `UserSummary` en la documentación Swagger.
 */
export class UserSummaryDto {
  /** Identificador único del usuario en formato UUID. */
  @ApiProperty({ format: 'uuid' })
  userId: string;

  /** Nombre completo del usuario. */
  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  /** Correo electrónico del usuario. */
  @ApiProperty({ format: 'email', example: 'juan@agrotrace.com' })
  email: string;

  /** Tipo de documento de identidad (CC, NIT o CE). */
  @ApiProperty({ example: 'CC' })
  documentType: string;

  /** Número de documento. */
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
  @ApiProperty({ example: 'Agricultor' })
  role: string;
}

/**
 * Total vendido y número de pedidos entregados en un periodo.
 * Representa el tipo `SalesSummary` en la documentación Swagger.
 */
export class SalesSummaryDto {
  /** Suma del valor de los pedidos entregados. */
  @ApiProperty({ example: 125000.5 })
  total: number;

  /** Cantidad de pedidos entregados. */
  @ApiProperty({ example: 4 })
  count: number;
}

/** Ventas del agricultor agrupadas por periodo. */
export class SalesPeriodsDto {
  /** Ventas desde el inicio de la semana. */
  @ApiProperty({ type: SalesSummaryDto })
  week: SalesSummaryDto;

  /** Ventas desde el inicio del mes. */
  @ApiProperty({ type: SalesSummaryDto })
  month: SalesSummaryDto;
}

/**
 * Perfil consolidado del agricultor: sus datos y sus métricas de ventas.
 * Representa el tipo `Profile` en la documentación Swagger.
 */
export class ProfileDto {
  /** Datos públicos del agricultor. */
  @ApiProperty({ type: UserSummaryDto })
  user: UserSummaryDto;

  /** Ventas de la semana y del mes. */
  @ApiProperty({ type: SalesPeriodsDto })
  sales: SalesPeriodsDto;
}
