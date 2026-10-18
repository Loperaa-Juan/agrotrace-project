import { ErrorApi, type RolUsuario, type TipoDocumento } from './auth-api';
import { CATALOG_API_URL as CATALOG_URL, ORDERS_API_URL as ORDERS_URL, USERS_API_URL as USERS_URL } from '../config/env';

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

export type Producto = {
  ProductId: string;
  name: string;
  unitOfMeasure: string;
  isActive: boolean;
};

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
};

export type EstadoPedido = 'Solicitado' | 'Aceptado' | 'Rechazado' | 'Entregado' | 'Cancelado';

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
  createdAt: string;
  updatedAt: string;
};

/** Total vendido y número de ventas entregadas en un periodo. */
export type ResumenVentas = {
  total: number;
  count: number;
};

/** Perfil del agricultor en orders-service: sus datos y lo vendido en la semana y el mes. */
export type PerfilAgricultor = {
  user: PerfilUsuario;
  sales: { week: ResumenVentas; month: ResumenVentas };
};

/** Datos que recibe catalog-service para crear una oferta; el agricultor sale del token. */
export type NuevaOferta = {
  productId: string;
  pricePerUnit: number;
  availableQuantity: number;
  description?: string;
  /** Formato YYYY-MM-DD. */
  harvestDate?: string;
};

/** Petición con el token de la sesión guardada, si la hay (las rutas públicas no lo exigen). */
async function pedir<T>(url: string, method = 'GET', cuerpo?: unknown): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const respuesta = await fetch(url, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(cuerpo !== undefined && { 'Content-Type': 'application/json' }),
    },
    ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, String(datos.message));
  return datos;
}

export const obtenerPerfil = () => pedir<PerfilUsuario>(`${USERS_URL}/users/me`);
export const obtenerCatalogo = () => pedir<Producto[]>(`${CATALOG_URL}/catalog`);
/** Ofertas activas de todos los agricultores, las más recientes primero. Es pública. */
export const obtenerOfertas = () => pedir<Oferta[]>(`${CATALOG_URL}/offerts`);
export const obtenerMisOfertas = () => pedir<Oferta[]>(`${CATALOG_URL}/offerts/me`);
export const crearOferta = (oferta: NuevaOferta) =>
  pedir<Oferta>(`${CATALOG_URL}/offerts`, 'POST', oferta);
export const retirarOferta =(id: string) => pedir<Oferta>(`${CATALOG_URL}/offerts/${id}`, 'DELETE');
export const obtenerPedidosRecibidos = () => pedir<Pedido[]>(`${ORDERS_URL}/orders/received`);
export const obtenerPerfilAgricultor = () =>
  pedir<PerfilAgricultor>(`${ORDERS_URL}/profile/me`);
export const obtenerMisPedidos =() => pedir<Pedido[]>(`${ORDERS_URL}/orders/me`);
