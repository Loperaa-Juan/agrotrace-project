import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import OrderDetail from '../../src/routes/app/order-detail';
import App from '../../src/App';
import { simularApi } from '../auth/utils';

function pedido(status: string, extra: Record<string, unknown> = {}) {
  return {
    OrderId: 'e5f6a7b8-1111-4222-8333-944445555666',
    buyerId: 'a1b2c3d4',
    offertId: 'o-aguacate',
    farmerId: 'c270fc1a',
    quantity: 10,
    unitPrice: 3500,
    totalPrice: 35000,
    status,
    deliveryCode: '482913',
    createdAt: '2026-10-12T15:00:00.000Z',
    updatedAt: '2026-10-14T15:00:00.000Z',
    ...extra,
  } as const;
}

const producto = {
  ProductId: 'p-aguacate',
  name: 'Aguacate Hass',
  unitOfMeasure: 'lb',
  isActive: true,
};

const agricultor = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  documentType: 'CC' as const,
  documentNumber: '1020304050',
  email: 'juan@agrotrace.com',
  phone: '3001234567',
  address: 'Vereda La Palma',
  municipality: 'Rionegro',
  role: 'Agricultor' as const,
};

function renderDetalle(status = 'Solicitado') {
  render(
    <OrderDetail
      agricultor={agricultor}
      pedido={pedido(status)}
      producto={producto}
    />,
  );
}

describe('Tests en Order detail', () => {
  it('Se debe renderizar el componente OrderDetail', () => {
    // Arrange
    renderDetalle();

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Pedido #E5F6A7B8' }),
    ).toBeInTheDocument();
    expect(screen.getByText('10 lb · Aguacate Hass')).toBeInTheDocument();
  });

  it.each(['Solicitado', 'Aceptado', 'Rechazado', 'Entregado', 'Cancelado'])(
    'Se le debe mostrar al usuario el estado %s de la orden',
    (estado) => {
      // Arrange
      renderDetalle(estado);

      // Assert
      expect(screen.getByLabelText('Estado del pedido')).toHaveTextContent(
        estado,
      );
    },
  );

  it('Si el estado es "Solicitado", se debe mostrar que la orden aún no ha sido aceptada', () => {
    // Arrange
    renderDetalle('Solicitado');

    // Assert
    expect(
      screen.getByText('Tu pedido aún no ha sido aceptado por el agricultor'),
    ).toBeInTheDocument();
  });

  it('Si el estado es "Solicitado", se debe mostrar un botón para cancelar la orden', () => {
    // Arrange
    renderDetalle('Solicitado');

    // Assert
    expect(
      screen.getByRole('button', { name: 'Cancelar pedido' }),
    ).toBeInTheDocument();
  });

  it('Si el estado no es "Solicitado", no se puede cancelar la orden', () => {
    // Arrange
    renderDetalle('Aceptado');

    // Assert
    expect(
      screen.queryByRole('button', { name: 'Cancelar pedido' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Tu pedido aún no ha sido aceptado por el agricultor'),
    ).not.toBeInTheDocument();
  });

  it('Se debe mostrar una línea de tiempo con los estados de la orden y sus fechas', () => {
    // Arrange
    renderDetalle('Aceptado');

    // Assert: cada paso de la línea de tiempo tiene su estado y su fecha
    const linea = screen.getByRole('list', { name: 'Línea de tiempo' });
    const pasos = within(linea).getAllByRole('listitem');

    expect(pasos).toHaveLength(2);
    expect(pasos[0]).toHaveTextContent('Solicitado');
    expect(pasos[0]).toHaveTextContent('12 de octubre de 2026');
    expect(pasos[1]).toHaveTextContent('Aceptado');
    expect(pasos[1]).toHaveTextContent('14 de octubre de 2026');
  });

  it('Debe renderizarse la información del agricultor responsable de la orden', () => {
    // Arrange
    renderDetalle();

    // Assert
    const seccion = screen.getByRole('region', { name: 'Agricultor' });
    expect(seccion).toHaveTextContent('Juan Pérez');
    expect(seccion).toHaveTextContent('3001234567');
    expect(seccion).toHaveTextContent('Rionegro');
  });

  it('Si el estado es "Aceptado", se debe mostrar el código de 6 dígitos para confirmar la entrega', () => {
    // Arrange
    renderDetalle('Aceptado');

    // Assert
    const codigo = screen.getByLabelText('Código de entrega');
    expect(codigo).toHaveTextContent('482913');
    expect(codigo.textContent).toMatch(/^\d{6}$/);
  });

  it('Si el estado no es "Aceptado", no se debe mostrar el código de entrega', () => {
    // Arrange
    renderDetalle('Solicitado');

    // Assert
    expect(
      screen.queryByLabelText('Código de entrega'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('482913')).not.toBeInTheDocument();
  });
});

describe('Página de detalle del pedido', () => {
  const fetchMock = vi.fn();

  const COMPRADOR = {
    userId: 'a1b2c3d4',
    name: 'Ana Gómez',
    email: 'ana@agrotrace.com',
    role: 'Persona',
  };

  // GET /orders/me trae los datos del agricultor guardados en el pedido
  const PEDIDO = {
    ...pedido('Aceptado'),
    farmer: {
      userId: agricultor.userId,
      name: agricultor.name,
      phone: agricultor.phone,
      municipality: agricultor.municipality,
    },
  };

  const OFERTA = {
    OffertId: 'o-aguacate',
    productId: 'p-aguacate',
    farmerId: 'c270fc1a',
    description: 'Cosecha de esta semana',
    pricePerUnit: 3500,
    availableQuantity: 120,
    harvestDate: '2026-10-10',
    aiQuality: 'A',
    isActive: true,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.pushState({}, '', '/');
  });

  function iniciarSesion() {
    localStorage.setItem('accessToken', 'access-token-123');
    localStorage.setItem('refreshToken', 'refresh-token-456');
    localStorage.setItem('usuario', JSON.stringify(COMPRADOR));
  }

  function abrirPedido() {
    window.history.pushState({}, '', `/pedidos/${PEDIDO.OrderId}`);
    render(<App />);
  }

  it('En /pedidos/:id se debe mostrar el detalle del pedido con su producto y su agricultor', async () => {
    // Arrange: un comprador logueado abre uno de sus pedidos
    iniciarSesion();
    simularApi(fetchMock, {
      'GET /orders/me': [200, [PEDIDO]],
      'GET /offerts': [200, [OFERTA]],
      'GET /catalog': [200, [producto]],
    });

    // Act
    abrirPedido();

    // Assert
    expect(
      await screen.findByRole('heading', { name: 'Pedido #E5F6A7B8' }),
    ).toBeInTheDocument();
    expect(screen.getByText('10 lb · Aguacate Hass')).toBeInTheDocument();
    const seccion = screen.getByRole('region', { name: 'Agricultor' });
    expect(seccion).toHaveTextContent('Juan Pérez');
    expect(seccion).toHaveTextContent('3001234567');
    expect(seccion).toHaveTextContent('Rionegro');
  });

  it('Si el pedido no es del comprador, se debe avisar que no se encontró', async () => {
    // Arrange
    iniciarSesion();
    simularApi(fetchMock, {
      'GET /orders/me': [200, []],
      'GET /offerts': [200, [OFERTA]],
      'GET /catalog': [200, [producto]],
    });

    // Act
    abrirPedido();

    // Assert
    expect(
      await screen.findByText('No encontramos este pedido entre los tuyos.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /volver a mis pedidos/i }),
    ).toHaveAttribute('href', '/pedidos');
  });

  it('Si la API falla, se debe mostrar un mensaje de error', async () => {
    // Arrange
    iniciarSesion();
    simularApi(fetchMock, {
      'GET /orders/me': [500, { message: 'Error interno' }],
      'GET /offerts': [200, [OFERTA]],
      'GET /catalog': [200, [producto]],
    });

    // Act
    abrirPedido();

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar el pedido. Intenta de nuevo.',
    );
  });

  it('Si la sesión venció, se debe cerrar la sesión y volver al login', async () => {
    // Arrange
    iniciarSesion();
    simularApi(fetchMock, {
      'GET /orders/me': [401, { message: 'Unauthorized' }],
      'GET /offerts': [200, [OFERTA]],
      'GET /catalog': [200, [producto]],
    });

    // Act
    abrirPedido();

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('Sin sesión iniciada, se debe redirigir al login', async () => {
    // Act
    abrirPedido();

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Al dar click en "Cancelar pedido" se debe cancelar el pedido', async () => {
    // Arrange: el pedido todavía está Solicitado
    const solicitado = { ...PEDIDO, status: 'Solicitado' };
    iniciarSesion();
    simularApi(fetchMock, {
      'GET /orders/me': [200, [solicitado]],
      'GET /offerts': [200, [OFERTA]],
      'GET /catalog': [200, [producto]],
      [`PATCH /orders/${PEDIDO.OrderId}/status`]: [
        200,
        { ...solicitado, status: 'Cancelado' },
      ],
    });
    abrirPedido();

    // Act
    fireEvent.click(
      await screen.findByRole('button', { name: 'Cancelar pedido' }),
    );

    // Assert: se pide a orders-service pasar el pedido a Cancelado
    await waitFor(() => {
      const peticion = fetchMock.mock.calls.find(
        ([url, opciones]) =>
          new URL(url).pathname === `/orders/${PEDIDO.OrderId}/status` &&
          opciones?.method === 'PATCH',
      );
      expect(peticion).toBeDefined();
      expect(JSON.parse(peticion![1].body)).toEqual({ status: 'Cancelado' });
    });

    // Assert: el detalle muestra el nuevo estado y ya no se puede cancelar
    await waitFor(() =>
      expect(screen.getByLabelText('Estado del pedido')).toHaveTextContent(
        'Cancelado',
      ),
    );
    expect(
      screen.queryByRole('button', { name: 'Cancelar pedido' }),
    ).not.toBeInTheDocument();
  });
});

describe('OrderDetail sin datos del agricultor', () => {
  it('Si el pedido no trae los datos del agricultor, se debe avisar en su sección', () => {
    // Arrange
    render(
      <OrderDetail
        agricultor={null}
        pedido={pedido('Aceptado')}
        producto={producto}
      />,
    );

    // Assert
    expect(
      screen.getByRole('region', { name: 'Agricultor' }),
    ).toHaveTextContent(
      'No tenemos los datos de contacto del agricultor de este pedido.',
    );
  });
});
