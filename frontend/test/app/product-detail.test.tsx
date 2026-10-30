import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProductDetail from '../../src/routes/app/product-detail';
import App from '../../src/App';
import { respuestaFetch, simularApi } from '../auth/utils';

const oferta = {
  OffertId: 'o-1',
  productId: 'p-aguacate',
  farmerId: 'c270fc1a',
  description: 'Cosecha de esta semana',
  pricePerUnit: 1000,
  availableQuantity: 120,
  harvestDate: '2026-10-10',
  aiQuality: 'A',
  isActive: true,
};

const producto = {
  ProductId: 'p-aguacate',
  name: 'Aguacate Hass',
  unitOfMeasure: 'lb',
  isActive: true,
};

// Mismo userId que el farmerId de la oferta
const AGRICULTOR = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  email: 'juan@agrotrace.com',
  role: 'Agricultor' as const,
};

const PERSONA = {
  userId: 'a1b2c3d4',
  name: 'Ana Gómez',
  email: 'ana@agrotrace.com',
  role: 'Persona' as const,
};

const NEGOCIO = {
  userId: 'b5e6f7a8',
  name: 'Restaurante La Buena Mesa',
  email: 'compras@buenamesa.com',
  role: 'Negocio' as const,
};

describe('Tests en el componente ProductDetail', () => {
  it('Debe mostrar el nombre, descripción y precio del producto', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Aguacate Hass' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cosecha de esta semana')).toBeInTheDocument();
    expect(screen.getByText(/\$ 1\.000 COP/)).toBeInTheDocument();
  });

  it('Se deben renderizar los botones de aumentar o disminuir cantidad', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Assert: vemos si los botones se renderizan
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const disminuir = screen.getByRole('button', { name: 'decrease-btn' });

    expect(aumentar).toBeInTheDocument();
    expect(disminuir).toBeInTheDocument();
  });

  it('El botón de increase debe aumentar la cantidad a ordenar', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Tomamos el botón, el texto y la cantidad
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });
    const inicial = Number(cantidad.value);

    // Act: hacemos click en aumentar
    fireEvent.click(aumentar);
    const final = Number(cantidad.value);

    // Assert
    expect(inicial).toBe(1);
    expect(cantidad).toBeInTheDocument();
    expect(final).toBe(inicial + 1);
  });

  //   Al dar click en el botón disminuir debemos aumentarle al pedido
  it('El botón de decrease debe disminuir la cantidad a ordenar', () => {
    // Arrange: renderizamos el detalle de la oferta
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Tomamos el botón, el texto y la cantidad
    const disminuir = screen.getByRole('button', { name: 'decrease-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });
    const inicial = Number(cantidad.value);

    // Act: hacemos click en aumentar
    fireEvent.click(disminuir);
    const final = Number(cantidad.value);

    // Assert
    expect(final).toBe(inicial - 1);
  });

  it('Un usuario sin rol negocio no puede agregar más de 50 libras', () => {
    // Arrange: renderizamos el detalle con un comprador persona
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={PERSONA} />,
    );
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });

    // Act: llegamos a 50 y tratamos de pasar a 51
    for (let i = 0; i < 50; i++) fireEvent.click(aumentar);

    // Assert
    expect(Number(cantidad.value)).toBe(50);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No puedes agregar más de 50 libras al carrito',
    );
  });

  it('Un usuario con rol negocio sí puede agregar más de 50 libras', () => {
    // Arrange: renderizamos el detalle con un comprador negocio
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={NEGOCIO} />,
    );
    const aumentar = screen.getByRole('button', { name: 'Increase-btn' });
    const cantidad = screen.getByRole<HTMLInputElement>('spinbutton', {
      name: 'Cantidad a ordenar',
    });

    // Act
    for (let i = 0; i < 50; i++) fireEvent.click(aumentar);

    // Assert
    expect(Number(cantidad.value)).toBe(51);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('Se debe tener un botón que diga "Ordenar ahora"', () => {
    // Arrange
    render(<ProductDetail oferta={oferta} producto={producto} />);

    // Assert
    expect(
      screen.getByRole('button', { name: 'Ordenar ahora' }),
    ).toBeInTheDocument();
  });

  it('Si la cantidad está en 0, el botón de disminuir debe estar deshabilitado', () => {
    // Arrange
    render(<ProductDetail oferta={oferta} producto={producto} />);
    const disminuir = screen.getByRole('button', { name: 'decrease-btn' });

    // Act: bajamos de 1 a 0
    fireEvent.click(disminuir);

    // Assert
    expect(disminuir).toBeDisabled();
  });

  it('Si la cantidad está en 0, el botón de "Ordenar ahora" debe estar deshabilitado', () => {
    // Arrange
    render(<ProductDetail oferta={oferta} producto={producto} />);
    const ordenar = screen.getByRole('button', { name: 'Ordenar ahora' });
    expect(ordenar).toBeEnabled();

    // Act: bajamos de 1 a 0
    fireEvent.click(screen.getByRole('button', { name: 'decrease-btn' }));

    // Assert
    expect(ordenar).toBeDisabled();
  });

  it('Al dar click en "Ordenar ahora" se debe abrir un diálogo de confirmación', () => {
    // Arrange
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={PERSONA} />,
    );

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar ahora' }));

    // Assert: el diálogo pregunta por el producto y tiene aceptar y cancelar
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('¿Estás seguro de ordenar Aguacate Hass?');
    expect(
      within(dialogo).getByRole('button', { name: 'Aceptar' }),
    ).toBeInTheDocument();
    expect(
      within(dialogo).getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
  });

  it('Si la publicación es del agricultor logueado, no puede comprar sus propios productos', () => {
    // Arrange: el agricultor logueado es el dueño de la oferta
    render(
      <ProductDetail oferta={oferta} producto={producto} usuario={AGRICULTOR} />,
    );

    // Assert
    expect(
      screen.getByText('No puedes comprar tus propios productos'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ordenar ahora' }),
    ).toBeDisabled();
  });

  describe('cuando el producto de la oferta no está en el catálogo', () => {
    it('muestra "Producto" como título y no inventa una unidad', () => {
      // Arrange
      render(<ProductDetail oferta={oferta} producto={undefined} />);

      // Assert
      expect(
        screen.getByRole('heading', { level: 1, name: 'Producto' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Máximo 50 por pedido.')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('el diálogo de confirmación habla de "este producto"', () => {
      // Arrange
      render(
        <ProductDetail oferta={oferta} producto={undefined} usuario={PERSONA} />,
      );

      // Act
      fireEvent.click(screen.getByRole('button', { name: 'Ordenar ahora' }));

      // Assert
      expect(screen.getByRole('dialog')).toHaveTextContent(
        '¿Estás seguro de ordenar este producto?',
      );
    });
  });
});

describe('Crear pedido desde ProductDetail', () => {
  const fetchMock = vi.fn();

  const OFERTA_ID = '3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607';
  const PEDIDO_CREADO = {
    OrderId: 'e5f6a7b8-1111-4222-8333-944445555666',
    buyerId: PERSONA.userId,
    offertId: OFERTA_ID,
    farmerId: oferta.farmerId,
    quantity: 1,
    unitPrice: 1000,
    totalPrice: 1000,
    status: 'Solicitado',
    deliveryCode: '482913',
    createdAt: '2026-10-12T15:00:00.000Z',
    updatedAt: '2026-10-12T15:00:00.000Z',
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

  it('Al dar click en "Aceptar" se debe crear el pedido y redirigir al detalle de ese pedido', async () => {
    // Arrange: un comprador logueado abre el detalle de la oferta
    localStorage.setItem('accessToken', 'access-token-123');
    localStorage.setItem('refreshToken', 'refresh-token-456');
    localStorage.setItem('usuario', JSON.stringify(PERSONA));
    simularApi(fetchMock, {
      'GET /offerts': [200, [{ ...oferta, OffertId: OFERTA_ID }]],
      'GET /catalog': [200, [producto]],
      'POST /orders': [201, PEDIDO_CREADO],
      'GET /orders/me': [200, [PEDIDO_CREADO]],
    });
    window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
    render(<App />);

    // Act: ordena y confirma en el diálogo
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ordenar ahora' }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Aceptar',
      }),
    );

    // Assert: se envía la oferta y la cantidad elegida
    await waitFor(() => {
      const peticion = fetchMock.mock.calls.find(
        ([url, opciones]) =>
          new URL(url).pathname === '/orders' && opciones?.method === 'POST',
      );
      expect(peticion).toBeDefined();
      expect(JSON.parse(peticion![1].body)).toEqual({
        offertId: OFERTA_ID,
        quantity: 1,
      });
    });

    // Assert: llega al detalle del pedido creado
    await waitFor(() =>
      expect(window.location.pathname).toBe(
        `/pedidos/${PEDIDO_CREADO.OrderId}`,
      ),
    );
  });

  it('Si no se puede crear el pedido, se debe mostrar un mensaje de error', async () => {
    // Arrange
    localStorage.setItem('accessToken', 'access-token-123');
    localStorage.setItem('refreshToken', 'refresh-token-456');
    localStorage.setItem('usuario', JSON.stringify(PERSONA));
    simularApi(fetchMock, {
      'GET /offerts': [200, [{ ...oferta, OffertId: OFERTA_ID }]],
      'GET /catalog': [200, [producto]],
      'POST /orders': [500, { message: 'Error interno' }],
    });
    window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
    render(<App />);

    // Act
    fireEvent.click(
      await screen.findByRole('button', { name: 'Ordenar ahora' }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Aceptar',
      }),
    );

    // Assert: se queda en el detalle de la oferta con el error
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(window.location.pathname).toBe(`/explorar/${OFERTA_ID}`);
  });

  it('Si la oferta no existe, se debe avisar que ya no está disponible', async () => {
    // Arrange
    simularApi(fetchMock, {
      'GET /offerts': [200, []],
      'GET /catalog': [200, [producto]],
    });

    // Act
    window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
    render(<App />);

    // Assert
    expect(
      await screen.findByText('Esta cosecha ya no está disponible.'),
    ).toBeInTheDocument();
  });

  it('Si el producto de la oferta no está en el catálogo, muestra el detalle con "Producto"', async () => {
    // Arrange
    simularApi(fetchMock, {
      'GET /offerts': [200, [{ ...oferta, OffertId: OFERTA_ID }]],
      'GET /catalog': [200, []],
    });

    // Act
    window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
    render(<App />);

    // Assert
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Producto' }),
    ).toBeInTheDocument();
  });

  it('Si no se puede cargar la cosecha, se debe mostrar un mensaje de error', async () => {
    // Arrange
    simularApi(fetchMock, {
      'GET /offerts': [500, { message: 'Error interno' }],
      'GET /catalog': [200, [producto]],
    });

    // Act
    window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
    render(<App />);

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar la cosecha. Intenta de nuevo.',
    );
  });

  describe('si se sale de la página antes de que respondan las peticiones', () => {
    /** Deja las peticiones colgadas para resolverlas o rechazarlas a mano. */
    function dejarPendientes() {
      const pendientes: {
        resolver: () => void;
        rechazar: () => void;
      }[] = [];
      fetchMock.mockImplementation(
        (url: string) =>
          new Promise((resolve, reject) => {
            pendientes.push({
              resolver: () =>
                resolve(
                  respuestaFetch(
                    200,
                    new URL(url).pathname === '/catalog' ? [producto] : [],
                  ),
                ),
              rechazar: () => reject(new Error('Sin red')),
            });
          }),
      );
      return pendientes;
    }

    const pasarUnTurno = () => new Promise((resolver) => setTimeout(resolver, 0));

    it('no actualiza la pantalla cuando llegan las respuestas', async () => {
      // Arrange
      const pendientes = dejarPendientes();
      window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
      const { unmount } = render(<App />);
      expect(pendientes).toHaveLength(2);

      // Act
      unmount();
      pendientes.forEach((pendiente) => pendiente.resolver());
      await pasarUnTurno();

      // Assert
      expect(screen.queryByRole('main')).not.toBeInTheDocument();
    });

    it('no muestra el error cuando las peticiones fallan', async () => {
      // Arrange
      const pendientes = dejarPendientes();
      window.history.pushState({}, '', `/explorar/${OFERTA_ID}`);
      const { unmount } = render(<App />);

      // Act
      unmount();
      pendientes.forEach((pendiente) => pendiente.rechazar());
      await pasarUnTurno();

      // Assert
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

describe('Diálogo de confirmación de ProductDetail', () => {
  it('Al dar click en "Cancelar" se debe cerrar el diálogo sin ordenar', () => {
    // Arrange
    const alConfirmar = vi.fn();
    render(
      <ProductDetail
        alConfirmar={alConfirmar}
        oferta={oferta}
        producto={producto}
        usuario={PERSONA}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar ahora' }));

    // Act
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    );

    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(alConfirmar).not.toHaveBeenCalled();
  });

  it('Al dar click en "Aceptar" se debe confirmar con la cantidad elegida', () => {
    // Arrange
    const alConfirmar = vi.fn();
    render(
      <ProductDetail
        alConfirmar={alConfirmar}
        oferta={oferta}
        producto={producto}
        usuario={PERSONA}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Increase-btn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar ahora' }));

    // Act
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Aceptar',
      }),
    );

    // Assert
    expect(alConfirmar).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
