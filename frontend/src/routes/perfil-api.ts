import { ErrorApi, type RolUsuario, type TipoDocumento } from './auth-api';

const USERS_URL = import.meta.env.VITE_USERS_API_URL ?? 'http://localhost:3000';
const CATALOG_URL = import.meta.env.VITE_CATALOG_API_URL ?? 'http://localhost:3002';
const ORDERS_URL = import.meta.env.VITE_ORDERS_API_URL ?? 'http://localhost:3004';

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
  createdAt: string;
  updatedAt: string;
};

/** Petición autenticada con el token de la sesión guardada. */
async function pedir<T>(url: string, method = 'GET'): Promise<T> {
  const respuesta = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, String(datos.message));
  return datos;
}

export const obtenerPerfil = () => pedir<PerfilUsuario>(`${USERS_URL}/users/me`);
export const obtenerCatalogo = () => pedir<Producto[]>(`${CATALOG_URL}/catalog`);
export const obtenerMisOfertas = () => pedir<Oferta[]>(`${CATALOG_URL}/offerts/me`);
export const retirarOferta = (id: string) => pedir<Oferta>(`${CATALOG_URL}/offerts/${id}`, 'DELETE');
export const obtenerPedidosRecibidos = () => pedir<Pedido[]>(`${ORDERS_URL}/orders/received`);
export const obtenerMisPedidos = () => pedir<Pedido[]>(`${ORDERS_URL}/orders/me`);
