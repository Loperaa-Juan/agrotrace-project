import type { RolUsuario } from './auth-api';

export const routes = {
  inicio: '/',
  login: '/login',
  registro: '/register',
  perfil: '/perfil',
  explorar: '/explorar',
  publicar: '/publicar',
  pedidos: '/pedidos',
};

/** Página a la que llega cada rol al abrir sesión: el agricultor a su perfil, los compradores al catálogo. */
export function inicioDe(rol: RolUsuario) {
  return rol === 'Agricultor' ? routes.perfil : routes.explorar;
}
