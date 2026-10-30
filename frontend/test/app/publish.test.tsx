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

const MB = 1024 * 1024;

/** Crea un archivo de prueba; `peso` fuerza el tamaño sin generar el contenido. */
function foto(nombre = 'aguacate.jpg', tipo = 'image/jpeg', peso?: number) {
  const archivo = new File(['foto'], nombre, { type: tipo });
  if (peso !== undefined)
    Object.defineProperty(archivo, 'size', { value: peso });
  return archivo;
}

/** Suelta un archivo sobre la zona de arrastrar y soltar de la foto. */
function soltarFoto(archivo: File) {
  fireEvent.drop(screen.getByTestId('zona-foto'), {
    dataTransfer: { files: [archivo] },
  });
}

/** Llena el paso 1 (120 lb de aguacate a $ 3.500 la libra) e intenta avanzar. */
async function llenarDatos(precio = '3500', archivo: File | null = foto()) {
  fireEvent.change(await screen.findByLabelText(/producto que vende/i), {
    target: { value: 'p-aguacate' },
  });
  if (archivo) soltarFoto(archivo);
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
    URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
    URL.revokeObjectURL = vi.fn();
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
    const datos = opciones.body as FormData;
    expect(datos.get('productId')).toBe('p-aguacate');
    expect(datos.get('pricePerUnit')).toBe('3500');
    expect(datos.get('availableQuantity')).toBe('120');
    expect(datos.get('harvestDate')).toBe('2026-10-20');
    expect((datos.get('image') as File).name).toBe('aguacate.jpg');
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
    expect((opciones.body as FormData).get('description')).toBe(
      'Recogido esta semana',
    );
  });

  describe('foto de la cosecha', () => {
    beforeEach(() => {
      iniciarSesion(AGRICULTOR);
      simularApi(fetchMock, API);
    });

    it('muestra la zona para arrastrar y soltar la foto', async () => {
      // Act
      renderPublicar();

      // Assert
      expect(await screen.findByLabelText(/foto de la cosecha/i)).toBeInTheDocument();
      expect(screen.getByTestId('zona-foto')).toHaveTextContent(
        'Arrastre la foto aquí o haga clic para elegirla',
      );
    });

    it('muestra la vista previa al soltar una foto', async () => {
      // Arrange
      renderPublicar();
      await screen.findByTestId('zona-foto');

      // Act
      soltarFoto(foto('mi-cosecha.jpg'));

      // Assert
      expect(screen.getByAltText('Vista previa de la foto')).toBeInTheDocument();
      expect(screen.getByText('mi-cosecha.jpg')).toBeInTheDocument();
    });

    it('muestra la vista previa al elegir la foto con el selector', async () => {
      // Arrange
      renderPublicar();
      const campo = await screen.findByLabelText(/foto de la cosecha/i);

      // Act
      fireEvent.change(campo, { target: { files: [foto('elegida.png', 'image/png')] } });

      // Assert
      expect(screen.getByAltText('Vista previa de la foto')).toBeInTheDocument();
    });

    it('rechaza un archivo que no es una imagen', async () => {
      // Arrange
      renderPublicar();
      await screen.findByTestId('zona-foto');

      // Act
      soltarFoto(foto('datos.pdf', 'application/pdf'));

      // Assert
      expect(screen.getByText('La foto debe ser JPG, PNG o WEBP.')).toBeInTheDocument();
      expect(screen.queryByAltText('Vista previa de la foto')).toBeNull();
    });

    it('rechaza una foto de más de 6 MB', async () => {
      // Arrange
      renderPublicar();
      await screen.findByTestId('zona-foto');

      // Act
      soltarFoto(foto('grande.jpg', 'image/jpeg', 6 * MB + 1));

      // Assert
      expect(screen.getByText('La foto no puede pesar más de 6 MB.')).toBeInTheDocument();
      expect(screen.queryByAltText('Vista previa de la foto')).toBeNull();
    });

    it('no avanza al paso 2 sin una foto', async () => {
      // Arrange
      renderPublicar();

      // Act
      await llenarDatos('3500', null);

      // Assert
      expect(
        screen.getByText('Agregue una foto de la cosecha para continuar.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Paso 2: Cuándo se recoge' }),
      ).toBeNull();
    });
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

  it('no avanza sin elegir un producto', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);
    renderPublicar();
    await screen.findByLabelText(/producto que vende/i);

    // Act
    fireEvent.click(
      screen.getByRole('button', { name: /siguiente: cuándo se recoge/i }),
    );

    // Assert
    expect(
      screen.getByText('Elija un producto del catálogo para continuar.'),
    ).toBeInTheDocument();
  });

  it('el botón Volver regresa al paso 1 conservando los datos', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, API);
    renderPublicar();
    await llegarAFecha();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Paso 1: Qué vende y a qué precio' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/cantidad disponible/i)).toHaveValue(120);
  });

  it('muestra un error genérico si falla la red al publicar', async () => {
    // Arrange: sin respuesta para POST /offerts, el fetch se rechaza
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, { 'GET /catalog': [200, PRODUCTOS] });
    renderPublicar();
    await llegarAFecha();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Publicar cosecha' }));

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos publicar su cosecha. Intente de nuevo.',
    );
  });

  it('cierra la sesión si vence al publicar', async () => {
    // Arrange
    iniciarSesion(AGRICULTOR);
    simularApi(fetchMock, {
      ...API,
      'POST /offerts': [401, { message: 'Unauthorized' }],
    });
    renderPublicar();
    await llegarAFecha();

    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Publicar cosecha' }));

    // Assert
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  describe('si se sale de la página antes de que responda el catálogo', () => {
    it('no actualiza la pantalla cuando la petición responde', async () => {
      // Arrange
      iniciarSesion(AGRICULTOR);
      let responder: () => void = () => {};
      fetchMock.mockImplementation(
        () =>
          new Promise((resolver) => {
            responder = () => resolver(respuestaFetch(200, PRODUCTOS));
          }),
      );
      window.history.pushState({}, '', '/publicar');
      const { unmount } = render(<App />);

      // Act
      unmount();
      responder();
      await new Promise((resolver) => setTimeout(resolver, 0));

      // Assert
      expect(screen.queryByLabelText(/producto que vende/i)).not.toBeInTheDocument();
    });

    it('no muestra el error cuando la petición falla', async () => {
      // Arrange
      iniciarSesion(AGRICULTOR);
      let rechazar: () => void = () => {};
      fetchMock.mockImplementation(
        () =>
          new Promise((_resolver, reject) => {
            rechazar = () => reject(new Error('Sin red'));
          }),
      );
      window.history.pushState({}, '', '/publicar');
      const { unmount } = render(<App />);

      // Act
      unmount();
      rechazar();
      await new Promise((resolver) => setTimeout(resolver, 0));

      // Assert
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('zona para soltar la foto', () => {
    beforeEach(() => {
      iniciarSesion(AGRICULTOR);
      simularApi(fetchMock, API);
    });

    it('se resalta al arrastrar encima y se normaliza al salir', async () => {
      // Arrange
      renderPublicar();
      const zona = await screen.findByTestId('zona-foto');

      // Act
      fireEvent.dragOver(zona);
      const resaltada = zona.className.includes('bg-green-50');
      fireEvent.dragLeave(zona);

      // Assert
      expect(resaltada).toBe(true);
      expect(zona.className).not.toContain('bg-green-50');
    });

    it('ignora un soltado sin archivos', async () => {
      // Arrange
      renderPublicar();
      const zona = await screen.findByTestId('zona-foto');

      // Act
      fireEvent.drop(zona, { dataTransfer: { files: [] } });

      // Assert
      expect(screen.queryByAltText('Vista previa de la foto')).toBeNull();
      expect(screen.queryByText(/la foto debe ser/i)).toBeNull();
    });
  });
});
