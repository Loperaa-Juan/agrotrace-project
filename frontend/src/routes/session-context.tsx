import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Sesion, Usuario } from './auth-api';

type ContextoSesion = {
  usuario: Usuario | null;
  entrar: (sesion: Sesion) => void;
  salir: () => void;
};

const SesionContext = createContext<ContextoSesion | null>(null);

function usuarioGuardado(): Usuario | null {
  const guardado = localStorage.getItem('usuario');
  return guardado ? JSON.parse(guardado) : null;
}

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

  const valor = useMemo(() => ({ usuario, entrar, salir }), [usuario, entrar, salir]);

  return <SesionContext value={valor}>{children}</SesionContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return contexto;
}
