import { USERS_API_URL as API_URL } from '../config/env';

export type RolUsuario = 'Agricultor' | 'Persona' | 'Negocio' | 'Admin';
export type TipoDocumento = 'CC' | 'CE' | 'NIT';

export type Usuario = {
  userId: string;
  name: string;
  email: string;
  role: RolUsuario;
};

export type Sesion = {
  accessToken: string;
  refreshToken: string;
  user: Usuario;
};

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

/** Respuesta de error del users-service, con su código HTTP. */
export class ErrorApi extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

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

export const iniciarSesion = (email: string, password: string) =>
  enviar('/auth/login', { email, password });

export const registrarUsuario = (usuario: NuevoUsuario) => enviar('/auth/register', usuario);

/** Revoca el refresh token en users-service para que no pueda renovar la sesión. */
export async function revocarSesion(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
}
