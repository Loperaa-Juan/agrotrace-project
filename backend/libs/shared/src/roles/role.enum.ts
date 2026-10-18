/**
 * Roles de los usuarios de AgroTrace. Admin no se puede elegir al registrarse:
 * se asigna directamente en la BD a quien administra el catálogo.
 * @readonly
 * @enum {string}
 * @property {string} AGRICULTOR `'Agricultor'`: productor que publica ofertas de sus cosechas.
 * @property {string} PERSONA `'Persona'`: persona natural que compra productos.
 * @property {string} NEGOCIO `'Negocio'`: negocio que compra productos.
 * @property {string} ADMIN `'Admin'`: administrador del catálogo.
 */
export enum Role {
  AGRICULTOR = 'Agricultor',
  PERSONA = 'Persona',
  NEGOCIO = 'Negocio',
  ADMIN = 'Admin',
}
