/**
 * @file Definición centralizada de las rutas de navegación del frontend de AgroTrace
 * y funciones auxiliares para la redirección según el rol del usuario.
 */

import type { RolUsuario } from './auth-api';

/**
 * Diccionario de rutas estáticas de la aplicación web.
 * @readonly
 */
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

/**
 * Genera la ruta dinámica para ver el detalle de una oferta específica.
 * @function detalleDe
 * @param {string} offertId ID único de la oferta.
 * @returns {string} Ruta formateada con el ID de la oferta.
 */
export const detalleDe = (offertId: string) => `${routes.explorar}/${offertId}`;

/**
 * Determina la página de inicio a la que llega cada rol al iniciar sesión con éxito.
 * El agricultor es redirigido a su perfil, y los compradores al catálogo general.
 * @function inicioDe
 * @param {RolUsuario} rol Rol actual del usuario autenticado.
 * @returns {string} Ruta de redirección correspondiente.
 */
export function inicioDe(rol: RolUsuario) {
  return rol === 'Agricultor' ? routes.perfil : routes.explorar;
}
