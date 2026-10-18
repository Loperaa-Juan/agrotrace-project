import type { RolUsuario } from './auth-api';

export const routes = {
  inicio: '/',
  login: '/login',
  registro: '/register',
  perfil: '/perfil',
  explorar: '/explorar',
  detalle: '/explorar/:offertId',
  filtros: '/filtros',
  publicar: '/publicar',
  pedidos: '/pedidos',
  detallePedido: '/pedidos/:orderId',
};

/** Ruta del detalle de una oferta, donde se hace el pedido. */
export const detalleDe = (offertId: string) => `${routes.explorar}/${offertId}`;

/** Página a la que llega cada rol al abrir sesión: el agricultor a su perfil, los compradores al catálogo. */
export function inicioDe(rol: RolUsuario) {
  return rol === 'Agricultor' ? routes.perfil : routes.explorar;
}
