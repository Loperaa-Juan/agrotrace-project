/**
 * @file API de perfiles, catálogo, ofertas y pedidos. Agrupa las tipografías y peticiones
 * HTTP hacia los microservicios `users-service`, `catalog-service` y `orders-service`.
 */

import { ErrorApi, type RolUsuario, type TipoDocumento } from './auth-api';
import { CATALOG_API_URL as CATALOG_URL, ORDERS_API_URL as ORDERS_URL, USERS_API_URL as USERS_URL } from '../config/env';

/** Estructura detallada del perfil de un usuario. */
export type PerfilUsuario = {
  userId: string;
  name: string;
  documentType: TipoDocumento;
  documentNumber: string;
  email: string;
  phone: string;
  address: string;
  municipality: string;
  role: RolUsuario;
};

/** Estructura de un producto registrado en el catálogo. */
export type Producto = {
  ProductId: string;
  name: string;
  unitOfMeasure: string;
  category?: string;
  description?: string | null;
  isActive: boolean;
};

/** Datos que recibe el `catalog-service` para crear un producto (solo Admin). */
export type NuevoProducto = {
  name: string;
  category: string;
  unitOfMeasure: string;
  description: string;
};

/** Estructura de una oferta publicada por un agricultor. */
export type Oferta = {
  OffertId: string;
  productId: string;
  farmerId: string;
  description: string;
  pricePerUnit: number;
  availableQuantity: number;
  harvestDate: string;
  aiQuality: string | null;
  isActive: boolean;
  /** URL pública de la foto en S3; `null` en las ofertas anteriores a la clasificación con IA. */
  imageUrl: string | null;
};

/** Información de contacto visible entre el comprador y el agricultor en un pedido. */
export type ContactoPedido = Pick<
  PerfilUsuario,
  'userId' | 'name' | 'phone' | 'municipality'
>;

/** Estados posibles en el ciclo de vida de un pedido. */
export type EstadoPedido = 'Solicitado' | 'Aceptado' | 'Rechazado' | 'Entregado' | 'Cancelado';

/** Estructura completa de un pedido dentro del sistema. */
export type Pedido = {
  OrderId: string;
  buyerId: string;
  offertId: string;
  farmerId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: EstadoPedido;
  /** Código de 6 dígitos que el comprador entrega al agricultor para confirmar la entrega. */
  deliveryCode?: string;
  /** Datos del agricultor guardados al crear el pedido; solo llegan en `GET /orders/me`. */
  farmer?: ContactoPedido | null;
  /** Datos del comprador guardados al crear el pedido; solo llegan en `GET /orders/received`. */
  buyer?: ContactoPedido | null;
  createdAt: string;
  updatedAt: string;
};

/** Resumen financiero: total vendido y número de ventas entregadas en un periodo determinado. */
export type ResumenVentas = {
  total: number;
  count: number;
};

/** Perfil del agricultor en el `orders-service`: sus datos personales y métricas de ventas semanales y mensuales. */
export type PerfilAgricultor = {
  user: PerfilUsuario;
  sales: { week: ResumenVentas; month: ResumenVentas };
};

/** Datos que recibe el `catalog-service` para crear una oferta (el ID del agricultor se extrae del token). */
export type NuevaOferta = {
  productId: string;
  pricePerUnit: number;
  availableQuantity: number;
  description?: string;
  /** Formato YYYY-MM-DD. */
  harvestDate?: string;
};

/**
 * Función auxiliar genérica para realizar peticiones HTTP autenticadas adjuntando el token de sesión.
 * @template T Tipo de dato esperado en la respuesta.
 * @throws {ErrorApi} Si el servidor responde con un código de error.
 * @param {string} url URL completa del endpoint a consumir.
 * @param {string} [method='GET'] Método HTTP de la petición (`GET`, `POST`, `PATCH`, `DELETE`, etc.).
 * @param {unknown} [cuerpo] Datos opcionales a enviar en el cuerpo de la petición.
 * @returns {Promise<T>} Datos deserializados devueltos por el servidor.
 */
async function pedir<T>(url: string, method = 'GET', cuerpo?: unknown): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const respuesta = await fetch(url, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(cuerpo !== undefined &&
        !(cuerpo instanceof FormData) && {
          'Content-Type': 'application/json',
        }),
    },
    ...(cuerpo !== undefined && {
      body: cuerpo instanceof FormData ? cuerpo : JSON.stringify(cuerpo),
    }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, String(datos.message));
  return datos;
}

/** Obtiene el perfil del usuario autenticado actualmente. */
export const obtenerPerfil = () => pedir<PerfilUsuario>(`${USERS_URL}/users/me`);

/** Obtiene el listado general de productos del catálogo. */
export const obtenerCatalogo = () => pedir<Producto[]>(`${CATALOG_URL}/catalog`);

/** Crea un producto en el catálogo maestro (solo Admin). */
export const crearProducto = (producto: NuevoProducto) =>
  pedir<Producto>(`${CATALOG_URL}/catalog`, 'POST', producto);

/** Obtiene las ofertas activas de todos los agricultores (ordenadas de la más reciente a la más antigua). Es un endpoint público. */
export const obtenerOfertas = () => pedir<Oferta[]>(`${CATALOG_URL}/offerts`);

/** Obtiene las ofertas publicadas por el agricultor autenticado. */
export const obtenerMisOfertas = () => pedir<Oferta[]>(`${CATALOG_URL}/offerts/me`);

/**
 * Crea una nueva oferta de productos agrícolas enviándola como `multipart/form-data`
 * junto con la foto de la fruta (campo `image`).
 * @param {NuevaOferta} oferta Datos de la oferta a crear.
 * @param {File} foto Foto de la fruta (jpeg, png o webp, máximo 6 MB).
 */
export const crearOferta = (oferta: NuevaOferta, foto: File) => {
  const datos = new FormData();
  for (const [campo, valor] of Object.entries(oferta))
    datos.append(campo, String(valor));
  datos.append('image', foto);
  return pedir<Oferta>(`${CATALOG_URL}/offerts`, 'POST', datos);
};

/**
 * Retira (elimina/desactiva) una oferta propia por su ID.
 * @param {string} id ID único de la oferta.
 */
export const retirarOferta =(id: string) => pedir<Oferta>(`${CATALOG_URL}/offerts/${id}`, 'DELETE');

/** Obtiene los pedidos recibidos por el agricultor autenticado. */
export const obtenerPedidosRecibidos = () => pedir<Pedido[]>(`${ORDERS_URL}/orders/received`);

/** Obtiene el perfil de rendimiento y resumen de ventas del agricultor autenticado. */
export const obtenerPerfilAgricultor = () =>
  pedir<PerfilAgricultor>(`${ORDERS_URL}/profile/me`);

/** Obtiene el historial de pedidos realizados por el comprador autenticado. */
export const obtenerMisPedidos =() => pedir<Pedido[]>(`${ORDERS_URL}/orders/me`);

/**
 * Crea un nuevo pedido a partir de una oferta seleccionada.
 * @param {string} offertId ID de la oferta a comprar.
 * @param {number} quantity Cantidad de unidades solicitadas.
 */
export const crearPedido = (offertId: string, quantity: number) =>
  pedir<Pedido>(`${ORDERS_URL}/orders`, 'POST', { offertId, quantity });

/**
 * Permite al comprador cancelar un pedido (solo permitido mientras se encuentre en estado 'Solicitado').
 * @param {string} orderId ID del pedido a cancelar.
 */
export const cancelarPedido = (orderId: string) =>
  pedir<Pedido>(`${ORDERS_URL}/orders/${orderId}/status`, 'PATCH', {
    status: 'Cancelado',
  });


/**
 * Permite al agricultor aceptar o rechazar un pedido recibido (solo en estado 'Solicitado').
 * @param {string} orderId ID del pedido.
 * @param {Extract<EstadoPedido, 'Aceptado' | 'Rechazado'>} status Nueva respuesta para el pedido.
 */
export const responderPedido = (
  orderId: string,
  status: Extract<EstadoPedido, 'Aceptado' | 'Rechazado'>,
) => pedir<Pedido>(`${ORDERS_URL}/orders/${orderId}/status`, 'PATCH', { status });


/**
 * Permite al agricultor confirmar la entrega de un pedido ingresando el código de seguridad dictado por el comprador.
 * @param {string} orderId ID del pedido.
 * @param {string} deliveryCode Código de entrega seguro de 6 dígitos.
 */
export const confirmarEntrega = (orderId: string, deliveryCode: string) =>
  pedir<Pedido>(`${ORDERS_URL}/orders/${orderId}/deliver`, 'PATCH', {
    deliveryCode,
  });
