import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../src/App';
import { respuestaFetch } from '../auth/utils';

const AGRICULTOR = {
  userId: 'c270fc1a',
  name: 'Juan Pérez',
  email: 'juan@agrotrace.com',
  role: 'Agricultor',
};

const COMPRADOR = {
  userId: 'a1b2c3d4',
  name: 'Ana Gómez',
  email: 'ana@agrotrace.com',
  role: 'Persona',
};

const PRODUCTOS = [
  {
    ProductId: 'p-aguacate',
    name: 'Aguacate Hass',
    unitOfMeasure: 'lb',
    isActive: true,
  },
  {
    ProductId: 'p-papa',
    name: 'Papa criolla',
    unitOfMeasure: 'lb',
    isActive: false,
  },
];

type Respuestas = Record<string, [status: number, body?: unknown]>;

const API: Respuestas = {
  'GET /catalog': [200, PRODUCTOS],
  'POST /offerts': [201, { OffertId: 'o-nueva' }],
};

/** Responde cada petición según su método y ruta, por ejemplo `POST /offerts`. */
function simularApi(
  fetchMock: ReturnType<typeof vi.fn>,
  respuestas: Respuestas,
) {
  fetchMock.mockImplementation((url: string, opciones?: RequestInit) => {
    const peticion = `${opciones?.method ?? 'GET'} ${new URL(url).pathname}`;
    const respuesta = respuestas[peticion];
    if (!respuesta)
      return Promise.reject(new Error(`Sin respuesta para ${peticion}`));
    return respuestaFetch(respuesta[0], respuesta[1] ?? {});
  });
}

function iniciarSesion(usuario: typeof AGRICULTOR) {
  localStorage.setItem('accessToken', 'access-token-123');
  localStorage.setItem('refreshToken', 'refresh-token-456');
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

/** Abre la aplicación completa en /publicar. */
function renderPublicar() {
  window.history.pushState({}, '', '/publicar');
  render(<App />);
}

/** Llena el paso 1 (120 lb de aguacate a $ 3.500 la libra) e intenta avanzar. */
async function llenarDatos(precio = '3500') {
  fireEvent.change(await screen.findByLabelText(/producto que vende/i), {
    target: { value: 'p-aguacate' },
  });
  fireEvent.change(screen.getByLabelText(/cantidad disponible/i), {
    target: { value: '120' },
  });
  fireEvent.change(screen.getByLabelText(/precio de venta/i), {
    target: { value: precio },
  });
  fireEvent.click(
    screen.getByRole('button', { name: /siguiente: cuándo se recoge/i }),
  );
}

/** Llega al paso 2 y elige la fecha de cosecha. */
async function llegarAFecha() {
  await llenarDatos();
  fireEvent.change(screen.getByLabelText(/fecha de cosecha/i), {
    target: { value: '2026-10-20' },
  });
}

describe('Publicar cosecha', () => {
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

  it('un comprador no puede publicar y va al catálogo de cosechas', async () => {
    // Arrange
    iniciarSesion(COMPRADOR);
    simularApi(fetchMock, {
      'GET /offerts': [200, []],
      'GET /catalog': [200, PRODUCTOS],
    });

    // Act
    renderPublicar();

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/explorar'));
  });

  it('el agricultor solo puede elegir productos activos del catálogo', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);

    // Act
    renderPublicar();

    // Assert
    expect(
      await screen.findByRole('option', { name: 'Aguacate Hass' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Papa criolla' })).toBeNull();
  });

  it('no avanza con un precio en cero', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);
    renderPublicar();

    // Act
    await llenarDatos('0');

    // Assert
    expect(
      screen.getByText(
        'El precio debe ser un valor en pesos mayor que cero, sin decimales.',
      ),
    ).toBeInTheDocument();
  });

  it('con datos válidos pasa al paso de la fecha de cosecha', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);
    renderPublicar();

    // Act
    await llenarDatos();

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Paso 2: Cuándo se recoge' }),
    ).toBeInTheDocument();
  });

  it('crea la oferta en catalog-service con los datos de la cosecha', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);
    renderPublicar();
    await llegarAFecha();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Publicar cosecha' }));

    // Assert
    expect(
      await screen.findByRole('heading', {
        name: '¡Su cosecha quedó publicada!',
      }),
    ).toBeInTheDocument();
    const [, opciones] = fetchMock.mock.calls.find(
      ([url]) => new URL(url).pathname === '/offerts',
    )!;
    expect(JSON.parse(opciones.body)).toEqual({
      productId: 'p-aguacate',
      pricePerUnit: 3500,
      availableQuantity: 120,
      harvestDate: '2026-10-20',
    });
  });

  it('muestra el mensaje del servidor si rechaza la oferta', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, {
      ...API,
      'POST /offerts': [
        404,
        { statusCode: 404, message: 'Product not found or inactive' },
      ],
    });
    renderPublicar();
    await llegarAFecha();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Publicar cosecha' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos publicar su cosecha: Product not found or inactive',
    );
  });

  it('envía la descripción cuando el agricultor la escribe', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);
    renderPublicar();
    fireEvent.change(await screen.findByLabelText(/descripción/i), {
      target: { value: '  Recogido esta semana  ' },
    });
    await llegarAFecha();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Publicar cosecha' }));

    // Assert: la descripción se envía sin espacios sobrantes
    await screen.findByRole('heading', {
      name: '¡Su cosecha quedó publicada!',
    });
    const [, opciones] = fetchMock.mock.calls.find(
      ([url]) => new URL(url).pathname === '/offerts',
    )!;
    expect(JSON.parse(opciones.body).description).toBe(
      'Recogido esta semana',
    );
  });

  it('muestra un error si no puede cargar el catálogo', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, {
      'GET /catalog': [500, { message: 'Error interno' }],
    });

    // Act
    renderPublicar();

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar el catálogo. Intente de nuevo.',
    );
  });

  it('cierra la sesión si vence mientras carga el catálogo', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, {
      'GET /catalog': [401, { message: 'Unauthorized' }],
    });

    // Act
    renderPublicar();

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
