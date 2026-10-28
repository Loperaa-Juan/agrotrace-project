/**
 * Roles de los usuarios de AgroTrace. Admin no se puede elegir al registrarse:
 * se asigna directamente en la BD a quien administra el catálogo.
 */
export enum Role {
  /** Productor que publica ofertas de sus cosechas. */
  AGRICULTOR = 'Agricultor',
  /** Persona natural que compra productos. */
  PERSONA = 'Persona',
  /** Negocio que compra productos. */
  NEGOCIO = 'Negocio',
  /** Administrador del catálogo. */
  ADMIN = 'Admin',
}
