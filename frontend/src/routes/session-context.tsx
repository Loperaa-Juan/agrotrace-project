/**
 * @file Contexto global de sesión para React. Permite gestionar el estado de autenticación,
 * almacenamiento de tokens en localStorage y control de cierre de sesión en toda la aplicación.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { revocarSesion, type Sesion, type Usuario } from './auth-api';

/**
 * Tipado de los datos y métodos expuestos por el contexto de sesión.
 */
type ContextoSesion = {
  /** Usuario actualmente autenticado, o `null` si no hay sesión. */
  usuario: Usuario | null;
  /** Almacena los datos de la sesión y el usuario tras un login exitoso. */
  entrar: (sesion: Sesion) => void;
  /** Borra la sesión guardada, por ejemplo cuando el token venció. */
  salir: () => void;
  /** El usuario cierra sesión: además revoca su refresh token en el servidor. */
  cerrarSesion: () => void;
};

const SesionContext = createContext<ContextoSesion | null>(null);

/**
 * Obtiene el usuario almacenado en el almacenamiento local del navegador.
 * @returns {Usuario | null} Objeto de usuario o `null` si no existe.
 */
function usuarioGuardado(): Usuario | null {
  const guardado = localStorage.getItem('usuario');
  return guardado ? JSON.parse(guardado) : null;
}

/**
 * Proveedor del contexto de sesión que envuelve la aplicación y gestiona el estado reactivo del usuario.
 * @component
 * @param {Object} props Propiedades del componente.
 * @param {ReactNode} props.children Componentes hijos que tendrán acceso al contexto de sesión.
 */
export function SesionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [usuario, setUsuario] = useState(usuarioGuardado);

  const entrar = useCallback((sesion: Sesion) => {
    localStorage.setItem('accessToken', sesion.accessToken);
    localStorage.setItem('refreshToken', sesion.refreshToken);
    localStorage.setItem('usuario', JSON.stringify(sesion.user));
    setUsuario(sesion.user);
  }, []);

  const salir = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }, []);

  // Sale sin esperar al servidor: si el logout falla, la sesión local igual queda cerrada
  const cerrarSesion = useCallback(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    salir();
    if (refreshToken) revocarSesion(refreshToken).catch(() => {});
  }, [salir]);

  const valor = useMemo(
    () => ({ usuario, entrar, salir, cerrarSesion }),
    [usuario, entrar, salir, cerrarSesion],
  );

  return <SesionContext value={valor}>{children}</SesionContext>;
}

/**
 * Hook personalizado para consumir de forma segura el contexto de sesión en cualquier componente.
 * @throws {Error} Si se intenta usar fuera de un {@link SesionProvider}.
 * @returns {ContextoSesion} Métodos y datos de la sesión actual.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return contexto;
}
