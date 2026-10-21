// Roles de los usuarios de agrotrace. Admin no se puede elegir al registrarse:
// se asigna directamente en la BD a quien administra el catálogo
export enum Role {
  AGRICULTOR = 'Agricultor',
  PERSONA = 'Persona',
  NEGOCIO = 'Negocio',
  ADMIN = 'Admin',
}
