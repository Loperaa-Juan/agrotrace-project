/**
 * @file API de autenticación y gestión de sesiones. Define los tipos de datos de usuarios,
 * sesiones, registros, y las funciones para interactuar con los endpoints de autenticación del `users-service`.
 */

import { USERS_API_URL as API_URL } from '../config/env';

/** Roles permitidos para los usuarios en la plataforma. */
export type RolUsuario = 'Agricultor' | 'Persona' | 'Negocio' | 'Admin';

/** Tipos de documentos de identidad válidos en el sistema. */
export type TipoDocumento = 'CC' | 'CE' | 'NIT';

/** Estructura de los datos del usuario autenticado. */
export type Usuario = {
  userId: string;
  name: string;
  email: string;
  role: RolUsuario;
};

/** Estructura de la sesión devuelta tras un inicio de sesión exitoso. */
export type Sesion = {
  accessToken: string;
  refreshToken: string;
  user: Usuario;
};

/** Datos requeridos para el registro de un nuevo usuario en la plataforma. */
export type NuevoUsuario = {
  name: string;
  documentType: TipoDocumento;
  documentNumber: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  municipality: string;
  role: Exclude<RolUsuario, 'Admin'>;
};

/** Respuesta de error del `users-service`, que incluye su código de estado HTTP. */
export class ErrorApi extends Error {
  status: number;

  /**
   * @param {number} status Código de estado HTTP del error.
   * @param {string} message Mensaje descriptivo del error.
   */
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Función auxiliar genérica para enviar peticiones POST a los endpoints de autenticación.
 * @throws {ErrorApi} Si la respuesta del servidor no es exitosa.
 * @param {string} ruta Ruta relativa del endpoint de autenticación.
 * @param {unknown} cuerpo Objeto con los datos que se enviarán en formato JSON.
 * @returns {Promise<Sesion>} Datos de la sesión generada.
 */
async function enviar(ruta: string, cuerpo: unknown): Promise<Sesion> {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, String(datos.message));
  return datos;
}

/**
 * Envía las credenciales para iniciar sesión en el sistema.
 * @function iniciarSesion
 * @param {string} email Correo electrónico del usuario.
 * @param {string} password Contraseña de acceso.
 * @returns {Promise<Sesion>} Promesa con la sesión y los tokens de acceso.
 */
export const iniciarSesion = (email: string, password: string) =>
  enviar('/auth/login', { email, password });

/**
 * Envía la información de un nuevo usuario para registrarlo en el sistema.
 * @function registrarUsuario
 * @param {NuevoUsuario} usuario Datos completos del nuevo usuario.
 * @returns {Promise<Sesion>} Promesa con la sesión del usuario recién creado.
 */
export const registrarUsuario = (usuario: NuevoUsuario) => enviar('/auth/register', usuario);

/**
 * Revoca el refresh token en el `users-service` para invalidar la renovación de la sesión.
 * @function revocarSesion
 * @async
 * @param {string} refreshToken Token de refresco que se desea revocar.
 * @returns {Promise<void>}
 */
export async function revocarSesion(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}
