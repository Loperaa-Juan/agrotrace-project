import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from '../../src/App';
import { respuestaFetch } from '../auth/utils';

const COMPRADOR = {
  userId: 'a1b2c3d4',
  name: 'Ana Gómez',
  email: 'ana@agrotrace.com',
  role: 'Persona',
};

const AGRICULTOR = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  email: 'juan@agrotrace.com',
  role: 'Agricultor',
};

const PRODUCTOS = [
  { ProductId: 'p-aguacate', name: 'Aguacate Hass', unitOfMeasure: 'lb', isActive: true },
  { ProductId: 'p-fresa', name: 'Fresa', unitOfMeasure: 'kg', isActive: true },
];

function oferta(id: string, productId: string) {
  return {
    OffertId: id,
    productId,
    farmerId: 'c270fc1a',
    description: 'Cosecha de esta semana',
    pricePerUnit: 3500,
    availableQuantity: 120,
    harvestDate: '2026-10-10',
    aiQuality: null,
    isActive: true,
  };
}

function pedido(
  id: string,
  offertId: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    OrderId: id,
    buyerId: 'a1b2c3d4',
    offertId,
    farmerId: 'c270fc1a',
    quantity: 10,
    unitPrice: 3500,
    totalPrice: 35000,
    status,
    createdAt: '2026-10-12T15:00:00.000Z',
    updatedAt: '2026-10-12T15:00:00.000Z',
    ...extra,
  };
}

const PEDIDO_AGUACATE = pedido('e5f6a7b8-1111-4222-8333-944445555666', 'o-aguacate', 'Solicitado');
const PEDIDO_FRESA = pedido('0a1b2c3d-1111-4222-8333-944445555666', 'o-fresa', 'Aceptado', {
  quantity: 2.5,
  unitPrice: 8000,
  totalPrice: 20000,
});
const PEDIDO_ENTREGADO = pedido('99887766-1111-4222-8333-944445555666', 'o-aguacate', 'Entregado');
const PEDIDO_CANCELADO = pedido('11223344-1111-4222-8333-944445555666', 'o-aguacate', 'Cancelado');

type Respuestas = Record<string, [status: number, body?: unknown]>;

/** Responde cada petición según su método y ruta, por ejemplo `GET /orders/me`. */
function simularApi(fetchMock: ReturnType<typeof vi.fn>, respuestas: Respuestas) {
  fetchMock.mockImplementation((url: string, opciones?: RequestInit) => {
    const peticion = `${opciones?.method ?? 'GET'} ${new URL(url).pathname}`;
    const respuesta = respuestas[peticion];
    if (!respuesta) return Promise.reject(new Error(`Sin respuesta para ${peticion}`));
    return respuestaFetch(respuesta[0], respuesta[1] ?? {});
  });
}

const API_COMPRADOR: Respuestas = {
  'GET /orders/me': [200, [PEDIDO_AGUACATE, PEDIDO_FRESA, PEDIDO_ENTREGADO, PEDIDO_CANCELADO]],
  'GET /offerts': [200, [oferta('o-aguacate', 'p-aguacate'), oferta('o-fresa', 'p-fresa')]],
  'GET /catalog': [200, PRODUCTOS],
};

const API_AGRICULTOR: Respuestas = {
  'GET /orders/received': [200, [PEDIDO_AGUACATE]],
  'GET /offerts/me': [200, [oferta('o-aguacate', 'p-aguacate')]],
  'GET /catalog': [200, PRODUCTOS],
};

function iniciarSesion(usuario: typeof COMPRADOR = COMPRADOR) {
  localStorage.setItem('accessToken', 'access-token-123');
  localStorage.setItem('refreshToken', 'refresh-token-456');
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

/** Abre la aplicación completa en /pedidos. */
function renderPedidos() {
  window.history.pushState({}, '', '/pedidos');
  render(<App />);
}

function pedidoDe(numero: string) {
  return within(screen.getByText(`Pedido #${numero}`).closest('li')!);
}

describe('Mis pedidos', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  describe('Comprador', () => {
    it('muestra el título de la página dentro del menú de la aplicación', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      expect(await screen.findByRole('heading', { level: 1, name: 'Mis pedidos' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ana gómez/i })).toBeInTheDocument();
    });

    it('pide sus pedidos a orders-service con su token', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      const [, opciones] = fetchMock.mock.calls.find(([url]) => url === 'http://localhost:3004/orders/me')!;
      expect(opciones.headers).toMatchObject({ Authorization: 'Bearer access-token-123' });
    });

    it('muestra cuántos pedidos están en curso', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      expect(await screen.findByText(/2 en curso de 4 pedidos/)).toBeInTheDocument();
    });

    it('muestra la cantidad y el producto de cada pedido', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      expect(pedidoDe('E5F6A7B8').getByRole('heading', { name: '10 lb · Aguacate Hass' })).toBeInTheDocument();
      expect(pedidoDe('0A1B2C3D').getByRole('heading', { name: '2,5 kg · Fresa' })).toBeInTheDocument();
    });

    it('muestra el total y la fecha en que se hizo el pedido', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      expect(pedidoDe('E5F6A7B8').getByText('$ 35.000 COP')).toBeInTheDocument();
      expect(pedidoDe('0A1B2C3D').getByText('$ 20.000 COP')).toBeInTheDocument();
      expect(pedidoDe('E5F6A7B8').getByText('12 de octubre de 2026')).toBeInTheDocument();
    });

    it.each([
      ['E5F6A7B8', 'Solicitado'],
      ['0A1B2C3D', 'Aceptado'],
      ['99887766', 'Entregado'],
      ['11223344', 'Cancelado'],
    ])('el pedido #%s muestra su estado %s', async (numero, estado) => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText(`Pedido #${numero}`);
      expect(pedidoDe(numero).getByText(estado)).toBeInTheDocument();
    });

    it('muestra el estado de un pedido rechazado', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, {
        ...API_COMPRADOR,
        'GET /orders/me': [200, [pedido('55667788-1111-4222-8333-944445555666', 'o-fresa', 'Rechazado')]],
      });

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #55667788');
      expect(pedidoDe('55667788').getByText('Rechazado')).toBeInTheDocument();
    });

    it('cada pedido enlaza a su detalle', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      expect(pedidoDe('E5F6A7B8').getByRole('link')).toHaveAttribute(
        'href',
        '/pedidos/e5f6a7b8-1111-4222-8333-944445555666',
      );
    });

    it('si la oferta ya no está publicada muestra el pedido como cosecha', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, { ...API_COMPRADOR, 'GET /offerts': [200, []] });

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      expect(pedidoDe('E5F6A7B8').getByRole('heading', { name: '10 · Cosecha' })).toBeInTheDocument();
    });

    it('invita a explorar las cosechas', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      expect(
        within(screen.getByRole('main')).getByRole('link', { name: /explorar cosechas/i }),
      ).toHaveAttribute('href', '/explorar');
    });

    it('muestra un mensaje si aún no ha hecho pedidos', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, { ...API_COMPRADOR, 'GET /orders/me': [200, []] });

      // Act
      renderPedidos();

      // Assert
      expect(
        await screen.findByText(
          'Aún no has hecho pedidos. Cuando pidas una cosecha, aquí verás su estado.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).toBeNull();
    });
  });

  describe('Agricultor', () => {
    it('ve los pedidos que recibió de los compradores', async () => {
      // Arrange
      iniciarSesion(AGRICULTOR);
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPedidos();

      // Assert
      await screen.findByText('Pedido #E5F6A7B8');
      expect(pedidoDe('E5F6A7B8').getByRole('heading', { name: '10 lb · Aguacate Hass' })).toBeInTheDocument();
      const urls = fetchMock.mock.calls.map(([url]) => url);
      expect(urls).toContain('http://localhost:3004/orders/received');
      expect(urls).toContain('http://localhost:3002/offerts/me');
      expect(urls.some((url) => url.endsWith('/orders/me'))).toBe(false);
    });
  });

  describe('Sesión y errores', () => {
    it('sin sesión lleva al login sin llamar al servidor', async () => {
      // Arrange
      simularApi(fetchMock, API_COMPRADOR);

      // Act
      renderPedidos();

      // Assert
      await vi.waitFor(() => expect(window.location.pathname).toBe('/login'));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('mientras carga muestra un aviso', () => {
      // Arrange
      iniciarSesion();
      fetchMock.mockImplementation(() => new Promise(() => {}));

      // Act
      renderPedidos();

      // Assert
      expect(screen.getByText('Cargando tus pedidos…')).toBeInTheDocument();
    });

    it('si la sesión venció la cierra y lleva al login', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, {
        ...API_COMPRADOR,
        'GET /orders/me': [401, { message: 'Unauthorized', statusCode: 401 }],
      });

      // Act
      renderPedidos();

      // Assert
      await vi.waitFor(() => expect(window.location.pathname).toBe('/login'));
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('muestra un error si no se pueden cargar los pedidos', async () => {
      // Arrange
      iniciarSesion();
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      // Act
      renderPedidos();

      // Assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos cargar tus pedidos. Intenta de nuevo.',
      );
    });
  });
});
