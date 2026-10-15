import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { PerfilPage } from '../../src/routes/app/perfil';
import { SesionProvider } from '../../src/routes/session-context';
import { respuestaFetch } from '../auth/utils';

const AGRICULTOR = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  documentType: 'CC',
  documentNumber: '1020304050',
  email: 'juan@agrotrace.com',
  phone: '3001234567',
  address: 'Calle 10 # 20-30',
  municipality: 'Envigado',
  role: 'Agricultor',
};

const PERSONA = { ...AGRICULTOR, userId: 'a1b2c3d4', name: 'Ana Gómez', role: 'Persona' };

const PRODUCTOS = [
  { ProductId: 'p-aguacate', name: 'Aguacate Hass', unitOfMeasure: 'lb', isActive: true },
  { ProductId: 'p-fresa', name: 'Fresa', unitOfMeasure: 'kg', isActive: true },
];

const OFERTA_ACTIVA = {
  OffertId: 'o-1',
  productId: 'p-aguacate',
  farmerId: 'c270fc1a',
  description: 'Cosecha de esta semana',
  pricePerUnit: 3500,
  availableQuantity: 120,
  harvestDate: '2026-10-01',
  aiQuality: 'Buena',
  isActive: true,
};

const OFERTA_RETIRADA = {
  ...OFERTA_ACTIVA,
  OffertId: 'o-2',
  productId: 'p-fresa',
  aiQuality: null,
  isActive: false,
};

function pedido(id: string, status: string, totalPrice: number, fecha: string) {
  return {
    OrderId: id,
    buyerId: 'a1b2c3d4',
    offertId: 'o-1',
    farmerId: 'c270fc1a',
    quantity: 10,
    unitPrice: 3500,
    totalPrice,
    status,
    createdAt: fecha,
    updatedAt: fecha,
  };
}

type Respuestas = Record<string, [status: number, body?: unknown]>;

/** Responde cada petición según su método y ruta, por ejemplo `GET /users/me`. */
function simularApi(fetchMock: ReturnType<typeof vi.fn>, respuestas: Respuestas) {
  fetchMock.mockImplementation((url: string, opciones?: RequestInit) => {
    const peticion = `${opciones?.method ?? 'GET'} ${new URL(url).pathname}`;
    const respuesta = respuestas[peticion];
    if (!respuesta) return Promise.reject(new Error(`Sin respuesta para ${peticion}`));
    return respuestaFetch(respuesta[0], respuesta[1] ?? {});
  });
}

/** Perfil del agricultor en orders-service: sus datos y las ventas que calcula el servidor. */
const PERFIL_AGRICULTOR = {
  user: AGRICULTOR,
  sales: {
    week: { total: 35000, count: 1 },
    month: { total: 185000, count: 2 },
  },
};

const API_AGRICULTOR: Respuestas = {
  'GET /profile/me': [200, PERFIL_AGRICULTOR],
  'GET /offerts/me': [200, [OFERTA_ACTIVA, OFERTA_RETIRADA]],
  'GET /catalog': [200, PRODUCTOS],
  'GET /orders/received': [
    200,
    [
      pedido('1', 'Solicitado', 35000, '2026-10-12T10:00:00'),
      pedido('2', 'Solicitado', 70000, '2026-10-13T10:00:00'),
      pedido('3', 'Entregado', 150000, '2026-10-05T10:00:00'),
      pedido('4', 'Entregado', 100000, '2026-09-20T10:00:00'),
    ],
  ],
};

const API_PERSONA: Respuestas = {
  'GET /users/me': [200, PERSONA],
  'GET /orders/me': [
    200,
    [
      pedido('5', 'Solicitado', 35000, '2026-10-12T10:00:00'),
      pedido('6', 'Aceptado', 35000, '2026-10-11T10:00:00'),
      pedido('7', 'Entregado', 70000, '2026-10-01T10:00:00'),
      pedido('8', 'Cancelado', 35000, '2026-09-30T10:00:00'),
    ],
  ],
};

function iniciarSesion(usuario = AGRICULTOR) {
  localStorage.setItem('accessToken', 'access-token-123');
  localStorage.setItem('refreshToken', 'refresh-token-456');
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

function renderPerfil() {
  render(
    <SesionProvider>
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </SesionProvider>,
  );
}

function resumen(nombre: string) {
  return within(screen.getByRole('region', { name: nombre }));
}

function ofertaDe(producto: string) {
  return within(screen.getByText(producto).closest('li')!);
}

describe('Perfil', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-14T12:00:00'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('Agricultor', () => {
    it('muestra sus datos pidiéndolos con su token', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Juan Pérez');
      expect(screen.getByText('Agricultor')).toBeInTheDocument();
      expect(screen.getByText('3001234567')).toBeInTheDocument();
      expect(screen.getByText('juan@agrotrace.com')).toBeInTheDocument();
      const [, opciones] = fetchMock.mock.calls.find(([url]) => url.endsWith('/profile/me'))!;
      expect(opciones.headers).toMatchObject({ Authorization: 'Bearer access-token-123' });
    });

    it('pide su perfil a orders-service', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      await screen.findByRole('heading', { level: 1 });
      const urls = fetchMock.mock.calls.map(([url]) => url);
      expect(urls).toContain('http://localhost:3004/profile/me');
      expect(urls.some((url) => url.endsWith('/users/me'))).toBe(false);
    });

    it('tiene enlaces para publicar una cosecha y ver sus pedidos', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByRole('link', { name: /publicar una cosecha/i })).toHaveAttribute(
        'href',
        '/publicar',
      );
      expect(screen.getByRole('link', { name: /ver mis pedidos/i })).toHaveAttribute(
        'href',
        '/pedidos',
      );
    });

    it('resume las ventas de la semana y del mes que calcula el servidor', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      await screen.findByRole('region', { name: 'Ventas de la semana' });
      expect(resumen('Ventas de la semana').getByText(/35\.000/)).toBeInTheDocument();
      expect(resumen('Ventas de la semana').getByText('1 venta entregada')).toBeInTheDocument();
      expect(resumen('Ventas del mes').getByText(/185\.000/)).toBeInTheDocument();
      expect(resumen('Ventas del mes').getByText('2 ventas entregadas')).toBeInTheDocument();
    });

    it('cuenta los pedidos por responder', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      await screen.findByRole('region', { name: 'Pedidos por responder' });
      expect(resumen('Pedidos por responder').getByText('2')).toBeInTheDocument();
    });

    it('lista su inventario con el producto, el precio y el estado', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      await screen.findByText('Aguacate Hass');
      expect(ofertaDe('Aguacate Hass').getByText(/3\.500/)).toBeInTheDocument();
      expect(ofertaDe('Aguacate Hass').getByText('120 lb disponibles')).toBeInTheDocument();
      expect(ofertaDe('Aguacate Hass').getByText('Activa')).toBeInTheDocument();
      expect(ofertaDe('Fresa').getByText('Retirada')).toBeInTheDocument();
    });

    it('muestra un mensaje si aún no tiene ofertas', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, { ...API_AGRICULTOR, 'GET /offerts/me': [200, []] });

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByText('Aún no has publicado cosechas.')).toBeInTheDocument();
    });

    it('retirar una oferta la marca como retirada', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, {
        ...API_AGRICULTOR,
        'DELETE /offerts/o-1': [200, { ...OFERTA_ACTIVA, isActive: false }],
      });
      renderPerfil();
      await screen.findByText('Aguacate Hass');

      // Act
      fireEvent.click(ofertaDe('Aguacate Hass').getByRole('button', { name: 'Retirar' }));

      // Assert
      await waitFor(() =>
        expect(ofertaDe('Aguacate Hass').getByText('Retirada')).toBeInTheDocument(),
      );
      expect(ofertaDe('Aguacate Hass').queryByRole('button', { name: 'Retirar' })).toBeNull();
    });
  });

  describe('Comprador', () => {
    it('resume sus pedidos activos y sus compras cerradas', async () => {
      // Arrange
      iniciarSesion(PERSONA);
      simularApi(fetchMock, API_PERSONA);

      // Act
      renderPerfil();

      // Assert
      await screen.findByRole('region', { name: 'Pedidos activos' });
      expect(resumen('Pedidos activos').getByText('2')).toBeInTheDocument();
      expect(resumen('Compras cerradas').getByText('1')).toBeInTheDocument();
    });

    it('lo invita a ver las cosechas en vez de publicar', async () => {
      // Arrange
      iniciarSesion(PERSONA);
      simularApi(fetchMock, API_PERSONA);

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByRole('link', { name: /ver cosechas de hoy/i })).toHaveAttribute(
        'href',
        '/explorar',
      );
      expect(screen.queryByRole('link', { name: /publicar una cosecha/i })).toBeNull();
    });
  });

  describe('Publicar una cosecha', () => {
    it('el agricultor ve el botón para publicar una cosecha', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByRole('link', { name: 'Publicar una cosecha' })).toHaveAttribute(
        'href',
        '/publicar',
      );
    });

    it.each(['Persona', 'Negocio', 'Admin'])(
      'el rol %s no ve el botón para publicar una cosecha',
      async (role) => {
        // Arrange
        const usuario = { ...PERSONA, role };
        iniciarSesion(usuario);
        simularApi(fetchMock, { ...API_PERSONA, 'GET /users/me': [200, usuario] });

        // Act
        renderPerfil();

        // Assert
        await screen.findByRole('heading', { level: 1, name: 'Ana Gómez' });
        expect(screen.getByRole('link', { name: /ver mis pedidos/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /publicar una cosecha/i })).toBeNull();
      },
    );
  });

  describe('Sesión y errores', () => {
    it('sin sesión lleva al login sin llamar al servidor', () => {
      // Arrange
      simularApi(fetchMock, API_AGRICULTOR);

      // Act
      renderPerfil();

      // Assert
      expect(screen.getByTestId('ubicacion')).toHaveTextContent('/login');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('si la sesión venció la cierra y lleva al login', async () => {
      // Arrange
      iniciarSesion();
      simularApi(fetchMock, {
        ...API_AGRICULTOR,
        'GET /profile/me': [401, { message: 'Unauthorized', statusCode: 401 }],
      });

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByTestId('ubicacion')).toHaveTextContent('/login');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('muestra un error si no se puede cargar el perfil', async () => {
      // Arrange
      iniciarSesion();
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      // Act
      renderPerfil();

      // Assert
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'No pudimos cargar tu perfil. Intenta de nuevo.',
      );
    });
  });
});
